const STEAM_OPENID_ENDPOINT = "https://steamcommunity.com/openid/login";
const STEAM_OPENID_NAMESPACE = "http://specs.openid.net/auth/2.0";
const STEAM_ID_PATTERN =
  /^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/;
const STEAM_ID_ONLY_PATTERN = /^\d{17}$/;
const PROOF_MAX_AGE_MS = 2 * 60 * 1000;
const OPENID_NONCE_MAX_AGE_MS = 10 * 60 * 1000;

export const STEAM_OPENID_STATE_COOKIE = "statrealm.steam-openid-state";

export type SteamProfile = {
  steamid: string;
  personaname: string;
  avatar: string;
  avatarmedium: string;
  avatarfull: string;
  profileurl: string;
  personastate?: number;
  lastlogoff?: number;
  loccountrycode?: string;
};

const STEAM_PROFILE_BATCH_SIZE = 100;

function parseSteamProfile(rawProfile: unknown): SteamProfile | null {
  if (!isRecord(rawProfile) || typeof rawProfile.steamid !== "string") {
    return null;
  }

  const personaname =
    typeof rawProfile.personaname === "string"
      ? rawProfile.personaname.trim()
      : "";
  const avatar =
    typeof rawProfile.avatar === "string" ? rawProfile.avatar : "";
  const avatarmedium =
    typeof rawProfile.avatarmedium === "string" ? rawProfile.avatarmedium : "";
  const avatarfull =
    typeof rawProfile.avatarfull === "string" ? rawProfile.avatarfull : "";
  const profileurl =
    typeof rawProfile.profileurl === "string" ? rawProfile.profileurl : "";

  if (!personaname || !profileurl) {
    return null;
  }

  const resolvedAvatarFull = avatarfull || avatarmedium || avatar;

  if (!resolvedAvatarFull) {
    return null;
  }

  return {
    steamid: rawProfile.steamid,
    personaname,
    avatar: avatar || avatarmedium || avatarfull,
    avatarmedium: avatarmedium || avatar || avatarfull,
    avatarfull: resolvedAvatarFull,
    profileurl,
    personastate:
      typeof rawProfile.personastate === "number"
        ? rawProfile.personastate
        : undefined,
    lastlogoff:
      typeof rawProfile.lastlogoff === "number"
        ? rawProfile.lastlogoff
        : undefined,
    loccountrycode:
      typeof rawProfile.loccountrycode === "string"
        ? rawProfile.loccountrycode
        : undefined,
  };
}

export async function getSteamProfiles(
  steamIds: string[],
): Promise<Map<string, SteamProfile>> {
  const apiKey = process.env.STEAM_API_KEY;

  if (!apiKey) {
    throw new Error("STEAM_API_KEY is not configured.");
  }

  const uniqueSteamIds = [
    ...new Set(steamIds.filter((steamId) => STEAM_ID_ONLY_PATTERN.test(steamId))),
  ];
  const profiles = new Map<string, SteamProfile>();

  for (
    let index = 0;
    index < uniqueSteamIds.length;
    index += STEAM_PROFILE_BATCH_SIZE
  ) {
    const chunk = uniqueSteamIds.slice(index, index + STEAM_PROFILE_BATCH_SIZE);
    const url = new URL(
      "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/",
    );
    url.searchParams.set("key", apiKey);
    url.searchParams.set("steamids", chunk.join(","));

    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Steam profile request failed (${response.status}).`);
    }

    const data: unknown = await response.json();
    const responseData = isRecord(data) ? data.response : undefined;
    const players = isRecord(responseData) ? responseData.players : undefined;

    if (!Array.isArray(players)) {
      continue;
    }

    for (const rawProfile of players) {
      const profile = parseSteamProfile(rawProfile);

      if (profile) {
        profiles.set(profile.steamid, profile);
      }
    }
  }

  return profiles;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getPublicOrigin() {
  const authUrl = process.env.AUTH_URL;

  if (!authUrl) {
    throw new Error("AUTH_URL is not configured.");
  }

  return new URL(authUrl).origin;
}

function getReturnTo(state: string) {
  const returnTo = new URL("/api/auth/steam/callback", getPublicOrigin());
  returnTo.searchParams.set("state", state);
  return returnTo.toString();
}

function getRequiredSecret() {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error("AUTH_SECRET is not configured.");
  }

  return secret;
}

function bytesToBase64Url(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64url");
}

function base64UrlToBytes(value: string) {
  return new Uint8Array(Buffer.from(value, "base64url"));
}

async function getHmacKey() {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getRequiredSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export function createSteamAuthorizationUrl(state: string) {
  const origin = getPublicOrigin();
  const url = new URL(STEAM_OPENID_ENDPOINT);

  url.searchParams.set("openid.mode", "checkid_setup");
  url.searchParams.set("openid.ns", STEAM_OPENID_NAMESPACE);
  url.searchParams.set(
    "openid.identity",
    "http://specs.openid.net/auth/2.0/identifier_select",
  );
  url.searchParams.set(
    "openid.claimed_id",
    "http://specs.openid.net/auth/2.0/identifier_select",
  );
  url.searchParams.set("openid.return_to", getReturnTo(state));
  url.searchParams.set("openid.realm", origin);

  return url;
}

export async function verifySteamAssertion(
  searchParams: URLSearchParams,
  expectedState: string,
) {
  const params = Object.fromEntries(searchParams);
  const claimedId = params["openid.claimed_id"] ?? "";
  const identity = params["openid.identity"] ?? "";
  const claimedMatch = claimedId.match(STEAM_ID_PATTERN);
  const identityMatch = identity.match(STEAM_ID_PATTERN);
  const nonceTimestamp = params["openid.response_nonce"]?.match(
    /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)/,
  )?.[1];
  const nonceIssuedAt = nonceTimestamp ? Date.parse(nonceTimestamp) : NaN;

  if (
    !expectedState ||
    params.state !== expectedState ||
    params["openid.mode"] !== "id_res" ||
    params["openid.op_endpoint"] !== STEAM_OPENID_ENDPOINT ||
    params["openid.ns"] !== STEAM_OPENID_NAMESPACE ||
    params["openid.return_to"] !== getReturnTo(expectedState) ||
    !Number.isFinite(nonceIssuedAt) ||
    Math.abs(Date.now() - nonceIssuedAt) > OPENID_NONCE_MAX_AGE_MS ||
    !claimedMatch ||
    !identityMatch ||
    claimedMatch[1] !== identityMatch[1]
  ) {
    throw new Error("Steam returned an invalid OpenID assertion.");
  }

  const verificationParams = new URLSearchParams(searchParams);
  verificationParams.set("openid.mode", "check_authentication");

  const response = await fetch(STEAM_OPENID_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: verificationParams,
    cache: "no-store",
  });

  if (!response.ok || !/is_valid\s*:\s*true/i.test(await response.text())) {
    throw new Error("Steam could not verify the OpenID assertion.");
  }

  return claimedMatch[1];
}

export async function createSteamProof(steamId: string, timestamp: string) {
  const signature = await crypto.subtle.sign(
    "HMAC",
    await getHmacKey(),
    new TextEncoder().encode(`${steamId}.${timestamp}`),
  );

  return bytesToBase64Url(new Uint8Array(signature));
}

export async function verifySteamProof({
  steamId,
  timestamp,
  signature,
}: {
  steamId: string;
  timestamp: string;
  signature: string;
}) {
  const issuedAt = Number(timestamp);

  if (
    !STEAM_ID_PATTERN.test(`https://steamcommunity.com/openid/id/${steamId}`) ||
    !Number.isFinite(issuedAt) ||
    Math.abs(Date.now() - issuedAt) > PROOF_MAX_AGE_MS
  ) {
    return false;
  }

  try {
    return await crypto.subtle.verify(
      "HMAC",
      await getHmacKey(),
      base64UrlToBytes(signature),
      new TextEncoder().encode(`${steamId}.${timestamp}`),
    );
  } catch {
    return false;
  }
}

export async function getSteamProfile(steamId: string) {
  const profiles = await getSteamProfiles([steamId]);
  const profile = profiles.get(steamId);

  if (!profile) {
    throw new Error("Steam profile was not found.");
  }

  return profile;
}
