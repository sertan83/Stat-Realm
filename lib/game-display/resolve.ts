import "server-only";

import { GAME_LIST_IMAGE_VARIANT } from "@/lib/game-display/constants";
import { getStoredGameMetadata, upsertStoredGameMetadata } from "@/lib/db";
import type { StoredGameImages } from "@/lib/db/types";
import type {
  GameDisplay,
  ResolveGameDisplayBatchOptions,
  ResolveGameDisplayInput,
  ResolveGameDisplayOptions,
} from "@/lib/game-display/types";
import { DEFAULT_GAME_FALLBACK_IMAGE } from "@/lib/steam/image-constants";
import { resolveGameMetadata } from "@/lib/steam/game-metadata";
import {
  getSteamBannerImageCandidates,
  getSteamExploreCardImageCandidates,
  resolveCapsuleFilenameForApp,
} from "@/lib/steam/game-images";
import { fetchStoreAppData } from "@/lib/steam/store-app-cache";
import { slugifyGameName } from "@/lib/slugify-game-name";
import type { SteamGameImageVariant } from "@/lib/steam/game-image-candidates-client";
import type { SteamImageCandidate } from "@/types/steam-images";

export type {
  GameDisplay,
  ResolveGameDisplayBatchOptions,
  ResolveGameDisplayInput,
  ResolveGameDisplayOptions,
} from "@/lib/game-display/types";

function candidatesToUrls(candidates: SteamImageCandidate[]) {
  return candidates.map((candidate) => candidate.url);
}

function sortCapsuleFirst(candidates: SteamImageCandidate[]) {
  const capsulePattern =
    /capsule_231x87|capsule_184x69|capsule_616x353|library_capsule|capsule_image/i;

  return [...candidates].sort((first, second) => {
    const firstScore =
      capsulePattern.test(first.url) || capsulePattern.test(first.label) ? 0 : 1;
    const secondScore =
      capsulePattern.test(second.url) || capsulePattern.test(second.label) ? 0 : 1;

    return firstScore - secondScore;
  });
}

function mergePreferredUrls(
  urls: string[],
  preferredUrls: Array<string | null | undefined> = [],
) {
  const seen = new Set<string>();
  const merged: string[] = [];

  function add(url: string | null | undefined) {
    const normalized = url?.trim();

    if (!normalized || seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    merged.push(normalized);
  }

  for (const preferredUrl of preferredUrls) {
    add(preferredUrl);
  }

  for (const url of urls) {
    add(url);
  }

  if (!merged.includes(DEFAULT_GAME_FALLBACK_IMAGE)) {
    merged.push(DEFAULT_GAME_FALLBACK_IMAGE);
  }

  return merged;
}

function pickPrimaryImageUrl(candidates: string[]) {
  return (
    candidates.find(
      (candidate) =>
        candidate.trim().length > 0 &&
        candidate !== DEFAULT_GAME_FALLBACK_IMAGE,
    ) ??
    candidates.find((candidate) => candidate.trim().length > 0) ??
    DEFAULT_GAME_FALLBACK_IMAGE
  );
}

function isValidImageCandidateList(candidates: string[] | undefined) {
  return Boolean(
    candidates?.some(
      (candidate) =>
        candidate.trim().length > 0 &&
        candidate !== DEFAULT_GAME_FALLBACK_IMAGE,
    ),
  );
}

function isValidGameDisplay(display: GameDisplay) {
  return (
    display.name.trim().length > 0 &&
    display.imageUrl.trim().length > 0 &&
    isValidImageCandidateList(display.imageCandidates)
  );
}

function hasStoredImages(images: StoredGameImages | undefined) {
  return Boolean(
    images?.card?.length || images?.header?.length || images?.capsule?.length,
  );
}

function buildImageSets(
  appId: number,
  storeData: Record<string, unknown> | null,
  capsuleFilename: string | undefined,
  logoUrl?: string,
  preferredUrls?: string[],
): StoredGameImages {
  const exploreCandidates = getSteamExploreCardImageCandidates(
    appId,
    capsuleFilename,
    logoUrl,
    storeData,
  );
  const listCandidates = sortCapsuleFirst(exploreCandidates);
  const listUrls = mergePreferredUrls(
    candidatesToUrls(listCandidates),
    preferredUrls,
  );
  const headerCandidates = getSteamBannerImageCandidates(
    appId,
    capsuleFilename,
    storeData,
  );

  return {
    card: listUrls,
    capsule: listUrls,
    header: mergePreferredUrls(
      candidatesToUrls(headerCandidates),
      preferredUrls,
    ),
  };
}

function selectVariantCandidates(
  images: StoredGameImages,
  variant: SteamGameImageVariant,
) {
  if (variant === "header") {
    return images.header ?? images.capsule ?? images.card ?? [];
  }

  if (variant === "capsule" || variant === "card") {
    return images.capsule ?? images.card ?? [];
  }

  return images.card ?? images.capsule ?? [];
}

function toGameDisplay(
  appId: number,
  name: string,
  images: StoredGameImages,
  variant: SteamGameImageVariant,
): GameDisplay {
  const imageCandidates = selectVariantCandidates(images, variant);

  return {
    appId,
    name,
    slug: slugifyGameName(name),
    imageUrl: pickPrimaryImageUrl(imageCandidates),
    imageCandidates,
    headerImageCandidates: images.header ?? [],
    capsuleImageCandidates: images.capsule ?? [],
  };
}

export async function resolveGameDisplay(
  appId: number,
  options?: ResolveGameDisplayOptions,
): Promise<GameDisplay> {
  const variant = options?.imageVariant ?? GAME_LIST_IMAGE_VARIANT;
  const persist = options?.persist ?? true;

  if (!Number.isInteger(appId) || appId <= 0) {
    return {
      appId,
      name: "",
      slug: String(appId),
      imageUrl: DEFAULT_GAME_FALLBACK_IMAGE,
      imageCandidates: [DEFAULT_GAME_FALLBACK_IMAGE],
      headerImageCandidates: [DEFAULT_GAME_FALLBACK_IMAGE],
      capsuleImageCandidates: [DEFAULT_GAME_FALLBACK_IMAGE],
    };
  }

  const stored = await getStoredGameMetadata(appId);
  if (stored?.name && hasStoredImages(stored.images)) {
    const cachedDisplay = toGameDisplay(appId, stored.name, stored.images!, variant);

    if (isValidGameDisplay(cachedDisplay)) {
      return cachedDisplay;
    }
  }

  const [{ name }, storeApp] = await Promise.all([
    resolveGameMetadata(appId, {
      steamId: options?.steamId,
      persist: false,
    }),
    fetchStoreAppData(appId).catch(() => ({
      success: false as const,
      data: null,
      source: "cache" as const,
    })),
  ]);

  const storeData = storeApp.success ? storeApp.data : null;
  const capsuleFilename = resolveCapsuleFilenameForApp({
    storeData,
    logoUrl: options?.logoUrl,
  });
  const images = buildImageSets(
    appId,
    storeData,
    capsuleFilename,
    options?.logoUrl,
    options?.preferredUrls,
  );

  if (persist) {
    await upsertStoredGameMetadata(appId, {
      name,
      capsuleFilename,
      images,
    });
  }

  return toGameDisplay(appId, name, images, variant);
}

export async function resolveGameDisplayBatch(
  entries: ResolveGameDisplayInput[],
  options?: ResolveGameDisplayBatchOptions,
): Promise<Map<number, GameDisplay>> {
  const uniqueEntries = new Map<number, ResolveGameDisplayInput>();

  for (const entry of entries) {
    if (!uniqueEntries.has(entry.appId)) {
      uniqueEntries.set(entry.appId, entry);
    }
  }

  const resolved = await Promise.all(
    [...uniqueEntries.values()].map(async (entry) => {
      const display = await resolveGameDisplay(entry.appId, {
        ...options,
        logoUrl: entry.logoUrl,
        preferredUrls: entry.preferredUrls,
      });

      return [entry.appId, display] as const;
    }),
  );

  return new Map(resolved);
}

export async function resolveGameImageCandidates(
  appId: number,
  variant: SteamGameImageVariant = GAME_LIST_IMAGE_VARIANT,
): Promise<string[]> {
  const display = await resolveGameDisplay(appId, {
    imageVariant: variant,
    persist: true,
  });

  if (variant === "header") {
    return display.headerImageCandidates;
  }

  if (variant === "capsule") {
    return display.capsuleImageCandidates;
  }

  return display.imageCandidates;
}

export async function resolveGameImageCandidatesBatch(
  appIds: number[],
  variant: SteamGameImageVariant = GAME_LIST_IMAGE_VARIANT,
): Promise<Map<number, string[]>> {
  const displays = await resolveGameDisplayBatch(
    appIds.map((appId) => ({ appId })),
    { imageVariant: variant, persist: true },
  );

  return new Map(
    [...displays.entries()].map(([appId, display]) => {
      if (variant === "header") {
        return [appId, display.headerImageCandidates] as const;
      }

      if (variant === "capsule") {
        return [appId, display.capsuleImageCandidates] as const;
      }

      return [appId, display.imageCandidates] as const;
    }),
  );
}

export function gameDisplayToGame(
  display: GameDisplay,
  category = "",
): import("@/types/game").Game {
  return {
    id: String(display.appId),
    title: display.name,
    slug: display.slug,
    imageUrl: display.imageUrl,
    imageCandidates: display.imageCandidates,
    category,
  };
}
