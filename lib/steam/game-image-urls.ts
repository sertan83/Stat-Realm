import { DEFAULT_GAME_FALLBACK_IMAGE } from "@/lib/steam/image-constants";

export type SteamGameImageVariant = "capsule" | "header" | "card";

const STORE_ASSET_HOSTS = [
  "https://shared.cloudflare.steamstatic.com",
  "https://shared.fastly.steamstatic.com",
  "https://shared.akamai.steamstatic.com",
] as const;

const LEGACY_STEAM_CDN = "https://cdn.cloudflare.steamstatic.com";
const STEAM_AKAMAI_CDN = "https://steamcdn-a.akamaihd.net";
const STEAM_CLOUD_CDN = "https://cdn.akamai.steamstatic.com";

const VARIANT_FILENAMES: Record<SteamGameImageVariant, string[]> = {
  capsule: [
    "capsule_616x353.jpg",
    "capsule_231x87.jpg",
    "capsule_184x69.jpg",
    "library_capsule.jpg",
    "header.jpg",
    "library_hero.jpg",
    "hero.jpg",
    "icon.jpg",
  ],
  header: [
    "header.jpg",
    "library_hero.jpg",
    "hero.jpg",
    "capsule_616x353.jpg",
    "capsule_231x87.jpg",
    "library_capsule.jpg",
  ],
  card: [
    "capsule_616x353.jpg",
    "capsule_231x87.jpg",
    "capsule_184x69.jpg",
    "library_capsule.jpg",
    "header.jpg",
    "library_hero.jpg",
    "hero.jpg",
    "icon.jpg",
  ],
};

function getValidCapsuleFilename(value?: string | null) {
  return value && /^[a-f0-9]+\/[a-zA-Z0-9_.-]+$/i.test(value) ? value : null;
}

function getCapsuleHash(capsuleFilename?: string | null) {
  const validCapsuleFilename = getValidCapsuleFilename(capsuleFilename);
  if (!validCapsuleFilename) {
    return null;
  }

  const [hash] = validCapsuleFilename.split("/");
  return hash ?? null;
}

export function isGenericFallbackImage(url: string | undefined | null) {
  const normalized = url?.trim();
  if (!normalized) {
    return true;
  }

  return (
    normalized === DEFAULT_GAME_FALLBACK_IMAGE ||
    normalized.startsWith("/images/game-image-fallback")
  );
}

const LEGACY_STEAM_CDN_GUESS_PATTERN =
  /\/steam\/apps\/\d+\/(?:header|library_hero|hero|library_capsule|capsule_\d+x\d+|icon)\.jpg$/i;

export function isLegacySteamCdnGuessUrl(url: string | undefined | null) {
  const normalized = url?.trim();
  if (!normalized || normalized.startsWith("/")) {
    return false;
  }

  try {
    const parsed = new URL(normalized);

    if (parsed.pathname.includes("/store_item_assets/")) {
      return false;
    }

    return (
      /steamstatic\.com|akamaihd\.net|akamai\.steamstatic\.com/i.test(
        parsed.hostname,
      ) && LEGACY_STEAM_CDN_GUESS_PATTERN.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}

export function isTrustedStoredGameImageUrl(url: string | undefined | null) {
  const normalized = url?.trim();
  if (!normalized || isGenericFallbackImage(normalized)) {
    return false;
  }

  if (isLegacySteamCdnGuessUrl(normalized)) {
    return false;
  }

  if (normalized.includes("/store_item_assets/steam/apps/")) {
    return true;
  }

  if (/media\.steamstatic\.com/i.test(normalized)) {
    return true;
  }

  return !normalized.startsWith("/");
}

export function isUsableGameImageUrl(url: string | undefined | null) {
  const normalized = url?.trim();
  if (!normalized) {
    return false;
  }

  return !isGenericFallbackImage(normalized);
}

function appendUnique(urls: string[], seen: Set<string>, url: string | null | undefined) {
  const normalized = url?.trim();
  if (!normalized || seen.has(normalized)) {
    return;
  }

  seen.add(normalized);
  urls.push(normalized);
}

function appendStoreAssetUrls(
  urls: string[],
  seen: Set<string>,
  appId: number,
  filename: string,
  hash?: string | null,
) {
  for (const host of STORE_ASSET_HOSTS) {
    if (hash) {
      appendUnique(urls, seen, `${host}/store_item_assets/steam/apps/${appId}/${hash}/${filename}`);
    }
    appendUnique(
      urls,
      seen,
      `${host}/store_item_assets/steam/apps/${appId}/${filename}`,
    );
  }

  appendUnique(urls, seen, `${LEGACY_STEAM_CDN}/steam/apps/${appId}/${filename}`);
  appendUnique(urls, seen, `${STEAM_AKAMAI_CDN}/steam/apps/${appId}/${filename}`);
  appendUnique(urls, seen, `${STEAM_CLOUD_CDN}/steam/apps/${appId}/${filename}`);
}

function sortCandidatesByTrust(urls: string[]) {
  const fallback = urls.filter(isGenericFallbackImage);
  const nonFallback = urls.filter((url) => !isGenericFallbackImage(url));
  const trusted: string[] = [];
  const legacy: string[] = [];
  const other: string[] = [];

  for (const url of nonFallback) {
    if (isTrustedStoredGameImageUrl(url)) {
      trusted.push(url);
    } else if (isLegacySteamCdnGuessUrl(url)) {
      legacy.push(url);
    } else {
      other.push(url);
    }
  }

  return [...trusted, ...other, ...legacy, ...fallback];
}

export function buildSteamGameImageCandidateUrls(
  appId: number,
  options?: {
    variant?: SteamGameImageVariant;
    preferredUrls?: Array<string | null | undefined>;
    capsuleFilename?: string | null;
    storedImageUrls?: string[];
    includeGenericFallback?: boolean;
  },
): string[] {
  if (!Number.isInteger(appId) || appId <= 0) {
    return options?.includeGenericFallback === false
      ? []
      : [DEFAULT_GAME_FALLBACK_IMAGE];
  }

  const variant = options?.variant ?? "card";
  const seen = new Set<string>();
  const urls: string[] = [];

  for (const preferredUrl of options?.preferredUrls ?? []) {
    appendUnique(urls, seen, preferredUrl);
  }

  for (const storedUrl of options?.storedImageUrls ?? []) {
    appendUnique(urls, seen, storedUrl);
  }

  const validCapsuleFilename = getValidCapsuleFilename(options?.capsuleFilename);
  if (validCapsuleFilename) {
    for (const host of STORE_ASSET_HOSTS) {
      appendUnique(
        urls,
        seen,
        `${host}/store_item_assets/steam/apps/${appId}/${validCapsuleFilename}`,
      );
    }
  }

  const hash = getCapsuleHash(options?.capsuleFilename);

  for (const filename of VARIANT_FILENAMES[variant]) {
    appendStoreAssetUrls(urls, seen, appId, filename, hash);
  }

  if (options?.includeGenericFallback !== false) {
    appendUnique(urls, seen, DEFAULT_GAME_FALLBACK_IMAGE);
  }

  return sortCandidatesByTrust(urls);
}
