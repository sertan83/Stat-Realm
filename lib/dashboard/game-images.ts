import "server-only";

import { getStoredGameMetadataForAppIds } from "@/lib/db";
import { GAME_LIST_IMAGE_VARIANT } from "@/lib/game-display/constants";
import type { StoredGameImages, StoredGameMetadata } from "@/lib/db/types";
import {
  buildSteamGameImageCandidateUrls,
  isTrustedStoredGameImageUrl,
  isUsableGameImageUrl,
} from "@/lib/steam/game-image-urls";
import { slugifyGameName } from "@/lib/slugify-game-name";

const IMAGE_ENRICHMENT_BATCH_SIZE = 20;

type DashboardGameWithImages = {
  id: string;
  title: string;
  slug?: string;
  imageUrl: string;
  imageFallbackUrl?: string;
  imageCandidates?: string[];
  capsuleFilename?: string;
};

function selectVariantCandidates(
  images: StoredGameImages,
  variant: typeof GAME_LIST_IMAGE_VARIANT,
) {
  if (variant === "header") {
    return images.header ?? images.capsule ?? images.card ?? [];
  }

  return images.capsule ?? images.card ?? images.header ?? [];
}

export function hasValidStoredGameImages(
  metadata: StoredGameMetadata | undefined,
) {
  if (!metadata?.images) {
    return false;
  }

  const candidates = selectVariantCandidates(
    metadata.images,
    GAME_LIST_IMAGE_VARIANT,
  );

  return candidates.some((candidate) => isTrustedStoredGameImageUrl(candidate));
}

function buildCandidatesFromMetadata(
  appId: number,
  metadata: StoredGameMetadata | undefined,
  game: DashboardGameWithImages,
) {
  const storedImageUrls = metadata?.images
    ? selectVariantCandidates(metadata.images, GAME_LIST_IMAGE_VARIANT).filter(
        isTrustedStoredGameImageUrl,
      )
    : [];

  return buildSteamGameImageCandidateUrls(appId, {
    variant: GAME_LIST_IMAGE_VARIANT,
    preferredUrls: [
      game.imageUrl,
      game.imageFallbackUrl,
      ...(game.imageCandidates ?? []),
    ],
    capsuleFilename: metadata?.capsuleFilename,
    storedImageUrls,
    includeGenericFallback: false,
  }).filter(isUsableGameImageUrl);
}

export function applyStoredMetadataToDashboardGame<
  T extends DashboardGameWithImages,
>(game: T, metadata: StoredGameMetadata | undefined): T {
  const appId = Number(game.id);
  const candidates =
    Number.isInteger(appId) && appId > 0
      ? buildCandidatesFromMetadata(appId, metadata, game)
      : [];

  if (candidates.length === 0) {
    return game;
  }

  return {
    ...game,
    title: metadata?.name.trim() || game.title,
    slug: slugifyGameName(metadata?.name.trim() || game.title),
    imageUrl: candidates[0] ?? game.imageUrl,
    imageFallbackUrl: candidates[1] ?? game.imageFallbackUrl,
    imageCandidates: candidates,
    capsuleFilename: metadata?.capsuleFilename ?? game.capsuleFilename,
  };
}

export async function applyStoredMetadataToDashboardGames<
  T extends DashboardGameWithImages,
>(games: T[]): Promise<T[]> {
  const appIds = games
    .map((game) => Number(game.id))
    .filter((appId) => Number.isInteger(appId) && appId > 0);

  if (appIds.length === 0) {
    return games;
  }

  const metadataByAppId = await getStoredGameMetadataForAppIds(appIds);

  return games.map((game) =>
    applyStoredMetadataToDashboardGame(
      game,
      metadataByAppId.get(Number(game.id)),
    ),
  );
}

export function dashboardGameNeedsImageEnrichment(
  game: DashboardGameWithImages,
  metadata?: StoredGameMetadata,
) {
  if (hasValidStoredGameImages(metadata)) {
    return false;
  }

  const appId = Number(game.id);
  return Number.isInteger(appId) && appId > 0;
}

export function collectUniqueDashboardGames<
  T extends DashboardGameWithImages,
>(...groups: T[][]) {
  const gamesById = new Map<string, T>();

  for (const group of groups) {
    for (const game of group) {
      gamesById.set(game.id, game);
    }
  }

  return [...gamesById.values()];
}

export function selectGamesForBackgroundImageEnrichment<
  T extends DashboardGameWithImages,
>(
  recentlyPlayed: T[],
  mostPlayedCatalog: T[],
  candidates: T[],
  metadataByAppId: Map<number, StoredGameMetadata>,
) {
  const priorityById = new Map<string, number>();

  recentlyPlayed.forEach((game, index) => {
    priorityById.set(game.id, index);
  });
  mostPlayedCatalog.forEach((game, index) => {
    if (!priorityById.has(game.id)) {
      priorityById.set(game.id, recentlyPlayed.length + index);
    }
  });

  return candidates
    .filter((game) =>
      dashboardGameNeedsImageEnrichment(
        game,
        metadataByAppId.get(Number(game.id)),
      ),
    )
    .sort(
      (first, second) =>
        (priorityById.get(first.id) ?? Number.MAX_SAFE_INTEGER) -
        (priorityById.get(second.id) ?? Number.MAX_SAFE_INTEGER),
    )
    .slice(0, IMAGE_ENRICHMENT_BATCH_SIZE);
}

export { IMAGE_ENRICHMENT_BATCH_SIZE };
