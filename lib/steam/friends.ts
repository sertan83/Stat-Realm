import "server-only";

import { SteamApiError, getSteamLevel } from "@/lib/steam/api";

const STEAM_API_ORIGIN = "https://api.steampowered.com";
const STEAM_ID_PATTERN = /^\d{17}$/;
const STEAM_PROFILE_BATCH_SIZE = 100;
const STEAM_LEVEL_BATCH_SIZE = 20;

export type SteamFriendListStatus = "available" | "private" | "unavailable";

export type SteamFriendPresenceStatus = "online" | "away" | "offline" | "inGame";

export type PublicSteamFriend = {
  steamId: string;
  personaName: string;
  avatarUrl: string;
  steamLevel: number | null;
  status: SteamFriendPresenceStatus;
  currentGame: string | null;
  lastLogoff: number | null;
};

type SteamFriendListResponse = {
  friendslist?: {
    friends?: Array<{
      steamid?: string;
      friend_since?: number;
    }>;
  };
};

type SteamPlayerSummaryResponse = {
  response?: {
    players?: unknown[];
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parsePlayerSummary(
  rawProfile: unknown,
  options?: { requirePublicProfile?: boolean },
): PublicSteamFriend | null {
  if (!isRecord(rawProfile) || typeof rawProfile.steamid !== "string") {
    return null;
  }

  const visibility = rawProfile.communityvisibilitystate;
  if (options?.requirePublicProfile !== false && visibility !== 3) {
    return null;
  }

  const personaName =
    typeof rawProfile.personaname === "string"
      ? rawProfile.personaname.trim()
      : "";
  const avatarfull =
    typeof rawProfile.avatarfull === "string" ? rawProfile.avatarfull : "";
  const avatarmedium =
    typeof rawProfile.avatarmedium === "string" ? rawProfile.avatarmedium : "";
  const avatar =
    typeof rawProfile.avatar === "string" ? rawProfile.avatar : "";
  const avatarUrl = avatarfull || avatarmedium || avatar;

  if (!personaName || !avatarUrl) {
    return null;
  }

  const personastate =
    typeof rawProfile.personastate === "number" ? rawProfile.personastate : 0;
  const gameName =
    typeof rawProfile.gameextrainfo === "string"
      ? rawProfile.gameextrainfo.trim()
      : "";
  const lastLogoff =
    typeof rawProfile.lastlogoff === "number" && rawProfile.lastlogoff > 0
      ? rawProfile.lastlogoff
      : null;

  let status: SteamFriendPresenceStatus = "offline";
  let currentGame: string | null = null;

  if (gameName) {
    status = "inGame";
    currentGame = gameName;
  } else if (personastate === 3 || personastate === 4) {
    status = "away";
  } else if (personastate > 0) {
    status = "online";
  }

  return {
    steamId: rawProfile.steamid,
    personaName,
    avatarUrl,
    steamLevel: null,
    status,
    currentGame,
    lastLogoff,
  };
}

async function steamFriendsRequest<T>(path: string, params: Record<string, string>) {
  const apiKey = process.env.STEAM_API_KEY;

  if (!apiKey) {
    throw new Error("STEAM_API_KEY is not configured.");
  }

  const url = new URL(path, STEAM_API_ORIGIN);
  url.searchParams.set("key", apiKey);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    const responseBody = await response.text().catch(() => undefined);
    throw new SteamApiError(
      `Steam API request failed for ${path} (${response.status}).`,
      response.status,
      responseBody,
    );
  }

  return (await response.json()) as T;
}

async function fetchFriendSteamIds(steamId: string) {
  try {
    const data = await steamFriendsRequest<SteamFriendListResponse>(
      "/ISteamUser/GetFriendList/v0001/",
      {
        steamid: steamId,
        relationship: "friend",
      },
    );

    const friends = data.friendslist?.friends ?? [];

    return {
      status: "available" as const,
      steamIds: friends.flatMap((friend) =>
        typeof friend.steamid === "string" &&
        STEAM_ID_PATTERN.test(friend.steamid)
          ? [friend.steamid]
          : [],
      ),
    };
  } catch (error) {
    if (error instanceof SteamApiError && (error.status === 401 || error.status === 403)) {
      return { status: "private" as const, steamIds: [] as string[] };
    }

    console.error("[StatRealm] Failed to fetch Steam friend list", {
      steamId,
      error,
    });

    return { status: "unavailable" as const, steamIds: [] as string[] };
  }
}

async function fetchFriendSummaries(
  steamIds: string[],
  options?: { requirePublicProfile?: boolean },
): Promise<PublicSteamFriend[]> {
  const friends: PublicSteamFriend[] = [];

  for (
    let index = 0;
    index < steamIds.length;
    index += STEAM_PROFILE_BATCH_SIZE
  ) {
    const chunk = steamIds.slice(index, index + STEAM_PROFILE_BATCH_SIZE);

    try {
      const data = await steamFriendsRequest<SteamPlayerSummaryResponse>(
        "/ISteamUser/GetPlayerSummaries/v0002/",
        { steamids: chunk.join(",") },
      );
      const players = data.response?.players ?? [];

      for (const rawProfile of players) {
        const parsed = parsePlayerSummary(rawProfile, options);
        if (parsed) {
          friends.push(parsed);
        }
      }
    } catch (error) {
      console.error("[StatRealm] Failed to fetch Steam friend summaries", {
        chunkSize: chunk.length,
        error,
      });
    }
  }

  return friends;
}

async function fetchPublicFriendSummaries(
  steamIds: string[],
): Promise<PublicSteamFriend[]> {
  return fetchFriendSummaries(steamIds, { requirePublicProfile: true });
}

async function attachSteamLevels(friends: PublicSteamFriend[]) {
  for (
    let index = 0;
    index < friends.length;
    index += STEAM_LEVEL_BATCH_SIZE
  ) {
    const chunk = friends.slice(index, index + STEAM_LEVEL_BATCH_SIZE);

    await Promise.all(
      chunk.map(async (friend) => {
        try {
          friend.steamLevel = await getSteamLevel(friend.steamId);
        } catch {
          friend.steamLevel = null;
        }
      }),
    );
  }
}

export async function getPublicSteamFriends(steamId: string): Promise<{
  status: SteamFriendListStatus;
  friends: PublicSteamFriend[];
}> {
  if (!STEAM_ID_PATTERN.test(steamId)) {
    return { status: "unavailable", friends: [] };
  }

  const friendList = await fetchFriendSteamIds(steamId);

  if (friendList.status !== "available") {
    return { status: friendList.status, friends: [] };
  }

  if (friendList.steamIds.length === 0) {
    return { status: "available", friends: [] };
  }

  const friends = await fetchPublicFriendSummaries(friendList.steamIds);

  if (friends.length > 0) {
    await attachSteamLevels(friends);
  }

  return { status: "available", friends };
}

export async function getSteamFriendSummaries(
  steamIds: string[],
): Promise<PublicSteamFriend[]> {
  if (steamIds.length === 0) {
    return [];
  }

  const friends = await fetchFriendSummaries(steamIds, {
    requirePublicProfile: false,
  });

  if (friends.length > 0) {
    await attachSteamLevels(friends);
  }

  return friends;
}

export async function getSteamFriendsList(steamId: string): Promise<{
  status: SteamFriendListStatus;
  steamIds: string[];
}> {
  if (!STEAM_ID_PATTERN.test(steamId)) {
    return { status: "unavailable", steamIds: [] };
  }

  const friendList = await fetchFriendSteamIds(steamId);

  return {
    status: friendList.status,
    steamIds: friendList.steamIds,
  };
}
