import "server-only";

import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";
import { DEFAULT_GAME_FALLBACK_IMAGE } from "@/lib/steam/image-constants";
import { isCacheableSteamImageUrl } from "@/lib/steam/image-url-utils";
import { pickPrimaryStoreArtworkUrl } from "@/lib/steam/store-artwork";
import type { SteamImageCandidate } from "@/types/steam-images";

const CACHE_PATH = path.join(process.cwd(), ".data", "game-image-cache.json");
const SUCCESSFUL_IMAGE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export type GameImageRole = "banner" | "cover" | "card";

type SuccessfulImageCacheEntry = {
  url: string;
  expiresAt: number;
};

type PersistedImageCache = Record<string, SuccessfulImageCacheEntry>;

const successfulImageCache = new Map<string, SuccessfulImageCacheEntry>();
let cacheHydrated = false;
let persistQueue: Promise<void> = Promise.resolve();

function getCacheKey(appId: number, role: GameImageRole) {
  return `${appId}:${role}`;
}

async function hydrateCacheFromDisk() {
  if (cacheHydrated) {
    return;
  }

  cacheHydrated = true;

  try {
    const raw = await readFile(CACHE_PATH, "utf8");
    const parsed = JSON.parse(raw) as PersistedImageCache;
    const now = Date.now();

    for (const [key, entry] of Object.entries(parsed)) {
      if (
        entry &&
        typeof entry.url === "string" &&
        typeof entry.expiresAt === "number" &&
        entry.expiresAt > now &&
        isCacheableSteamImageUrl(entry.url)
      ) {
        successfulImageCache.set(key, entry);
      }
    }
  } catch (error) {
    if (
      typeof error !== "object" ||
      error === null ||
      !("code" in error) ||
      error.code !== "ENOENT"
    ) {
      throw error;
    }
  }
}

function schedulePersistToDisk() {
  persistQueue = persistQueue
    .then(async () => {
      await mkdir(path.dirname(CACHE_PATH), { recursive: true });
      const payload = Object.fromEntries(successfulImageCache.entries());
      const tempPath = `${CACHE_PATH}.tmp`;
      await writeFile(tempPath, JSON.stringify(payload, null, 2), "utf8");
      await rename(tempPath, CACHE_PATH);
    })
    .catch(() => undefined);
}

export async function getCachedSuccessfulGameImage(
  appId: number,
  role: GameImageRole,
) {
  await hydrateCacheFromDisk();

  const entry = successfulImageCache.get(getCacheKey(appId, role));
  if (!entry || entry.expiresAt <= Date.now()) {
    if (entry) {
      successfulImageCache.delete(getCacheKey(appId, role));
    }
    return null;
  }

  return entry.url;
}

export async function cacheSuccessfulGameImage(
  appId: number,
  role: GameImageRole,
  url: string,
) {
  if (!isCacheableSteamImageUrl(url)) {
    return;
  }

  await hydrateCacheFromDisk();

  successfulImageCache.set(getCacheKey(appId, role), {
    url,
    expiresAt: Date.now() + SUCCESSFUL_IMAGE_CACHE_TTL_MS,
  });
  schedulePersistToDisk();
}

export async function reorderCandidatesWithCachedUrl(
  appId: number,
  role: GameImageRole,
  candidates: SteamImageCandidate[],
  storeData?: Record<string, unknown> | null,
) {
  const storePreferredUrl = pickPrimaryStoreArtworkUrl(storeData, role);
  const cachedUrl = await getCachedSuccessfulGameImage(appId, role);

  if (storePreferredUrl) {
    const storeCandidate = candidates.find(
      (candidate) => candidate.url === storePreferredUrl,
    );
    const remainingCandidates = candidates.filter(
      (candidate) =>
        candidate.url !== storePreferredUrl && candidate.url !== cachedUrl,
    );

    return [
      storeCandidate ?? {
        label: "Official Store Artwork",
        url: storePreferredUrl,
      },
      ...(cachedUrl && cachedUrl !== storePreferredUrl
        ? [
            candidates.find((candidate) => candidate.url === cachedUrl) ?? {
              label: "Cached image",
              url: cachedUrl,
            },
          ]
        : []),
      ...remainingCandidates,
    ];
  }

  if (!cachedUrl) {
    return candidates;
  }

  const cachedCandidate = candidates.find(
    (candidate) => candidate.url === cachedUrl,
  );
  const remainingCandidates = candidates.filter(
    (candidate) => candidate.url !== cachedUrl,
  );

  return [
    cachedCandidate ?? { label: "Cached image", url: cachedUrl },
    ...remainingCandidates,
  ];
}

export async function buildPrimaryImageResult(
  appId: number,
  role: GameImageRole,
  candidates: SteamImageCandidate[],
  options?: {
    preferredUrl?: string;
    storeData?: Record<string, unknown> | null;
  },
) {
  const reordered = await reorderCandidatesWithCachedUrl(
    appId,
    role,
    candidates,
  );
  const storePreferredUrl = pickPrimaryStoreArtworkUrl(options?.storeData, role);
  const safePreferredUrl = isCacheableSteamImageUrl(options?.preferredUrl)
    ? options?.preferredUrl
    : isCacheableSteamImageUrl(storePreferredUrl)
      ? storePreferredUrl
      : undefined;

  if (safePreferredUrl) {
    await cacheSuccessfulGameImage(appId, role, safePreferredUrl);
    const preferredCandidate = reordered.find(
      (candidate) => candidate.url === safePreferredUrl,
    );
    const orderedCandidates = [
      preferredCandidate ?? {
        label: "Preferred image",
        url: safePreferredUrl,
      },
      ...reordered.filter((candidate) => candidate.url !== safePreferredUrl),
    ];

    return {
      imageUrl: safePreferredUrl,
      candidates: orderedCandidates,
    };
  }

  const cachedUrl = await getCachedSuccessfulGameImage(appId, role);
  const firstSteamCandidate = reordered.find(
    (candidate) => candidate.url !== DEFAULT_GAME_FALLBACK_IMAGE,
  );
  const imageUrl =
    cachedUrl ??
    firstSteamCandidate?.url ??
    reordered[0]?.url ??
    DEFAULT_GAME_FALLBACK_IMAGE;

  return {
    imageUrl,
    candidates: reordered,
  };
}
