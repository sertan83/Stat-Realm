import "server-only";

import { featuredGames } from "@/data/games";
import { resolveGameListGames } from "@/lib/game-display/game-list";
import { DEFAULT_GAME_FALLBACK_IMAGE } from "@/lib/steam/image-constants";
import type { Game } from "@/types/game";

function toStaticFeaturedGame(game: (typeof featuredGames)[number]): Game {
  return {
    id: String(Number(game.id)),
    title: game.title,
    slug: String(Number(game.id)),
    imageUrl: game.imageUrl,
    imageCandidates: [game.imageUrl],
    category: game.category,
  };
}

export async function loadFeaturedGames(): Promise<Game[]> {
  const sources = featuredGames.map((game) => ({
    appId: Number(game.id),
    title: game.title,
    category: game.category,
  }));

  try {
    const resolved = await resolveGameListGames(sources, { persist: true });

    return resolved.map((game, index) => {
      const fallback = toStaticFeaturedGame(featuredGames[index]);

      return {
        ...fallback,
        ...game,
        id: String(Number(game.id) || Number(fallback.id)),
        title: game.title || fallback.title,
        category: fallback.category,
        imageUrl:
          game.imageUrl && game.imageUrl !== DEFAULT_GAME_FALLBACK_IMAGE
            ? game.imageUrl
            : fallback.imageUrl,
        imageCandidates:
          game.imageCandidates?.filter(
            (candidate) =>
              candidate.trim().length > 0 &&
              candidate !== DEFAULT_GAME_FALLBACK_IMAGE,
          ).length
            ? game.imageCandidates
            : fallback.imageCandidates,
      };
    });
  } catch (error) {
    console.error("[Popular Games] Failed to resolve featured game metadata", error);
    return featuredGames.map(toStaticFeaturedGame);
  }
}
