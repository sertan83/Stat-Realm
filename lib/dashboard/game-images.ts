import "server-only";

import { GAME_LIST_IMAGE_VARIANT } from "@/lib/game-display/constants";
import type { StoredGameImages, StoredGameMetadata } from "@/lib/db/types";
import { DEFAULT_GAME_FALLBACK_IMAGE } from "@/lib/steam/image-constants";
import { slugifyGameName } from "@/lib/slugify-game-name";

const IMAGE_ENRICHMENT_BATCH_SIZE = 12;

type DashboardGameWithImages = {
  id: string;
  title: string;
  slug?: string;
  imageUrl: string;
  imageFallbackUrl?: string;
  imageCandidates?: string[];
};

function isUsableImageUrl(url: string | undefined) {
  const normalized = url?.trim();
  if (!normalized) {
    return false;
  }

  return (
    normalized !== DEFAULT_GAME_FALLBACK_IMAGE &&
    !normalized.startsWith("/images/game-image-fallback")
  );
}

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

  return candidates.some((candidate) => isUsableImageUrl(candidate));
}

export function applyStoredMetadataToDashboardGame<
  T extends DashboardGameWithImages,
>(game: T, metadata: StoredGameMetadata | undefined): T {
  if (!hasValidStoredGameImages(metadata) || !metadata) {
    return game;
  }

  const candidates = selectVariantCandidates(
    metadata.images!,
    GAME_LIST_IMAGE_VARIANT,
  ).filter((candidate) => isUsableImageUrl(candidate));
  const imageUrl = candidates[0] ?? game.imageUrl;

  return {
    ...game,
    title: metadata.name.trim() || game.title,
    slug: slugifyGameName(metadata.name.trim() || game.title),
    imageUrl,
    imageFallbackUrl: candidates[1] ?? game.imageFallbackUrl,
    imageCandidates: candidates.length > 0 ? candidates : game.imageCandidates,
  };
}

export function dashboardGameNeedsImageEnrichment(
  game: DashboardGameWithImages,
) {
  if (isUsableImageUrl(game.imageUrl)) {
    return false;
  }

  return !game.imageCandidates?.some((candidate) =>
    isUsableImageUrl(candidate),
  );
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
    .filter((game) => dashboardGameNeedsImageEnrichment(game))
    .sort(
      (first, second) =>
        (priorityById.get(first.id) ?? Number.MAX_SAFE_INTEGER) -
        (priorityById.get(second.id) ?? Number.MAX_SAFE_INTEGER),
    )
    .slice(0, IMAGE_ENRICHMENT_BATCH_SIZE);
}

export { IMAGE_ENRICHMENT_BATCH_SIZE };
