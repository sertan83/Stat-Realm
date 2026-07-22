import "server-only";

import { featuredGames } from "@/data/games";
import { resolveGameListGames } from "@/lib/game-display/game-list";
import { DEFAULT_GAME_FALLBACK_IMAGE } from "@/lib/steam/image-constants";
import type { Game } from "@/types/game";

export async function loadFeaturedGames(): Promise<Game[]> {
  const resolvedGames = await resolveGameListGames(
    featuredGames.map((game) => ({
      appId: Number(game.id),
      category: game.category,
    })),
    { persist: true },
  );

  return resolvedGames.map((game, index) => {
    const staticGame = featuredGames[index];

    return {
      ...game,
      title: game.title || staticGame.title,
      category: staticGame.category,
      imageUrl: game.imageUrl || DEFAULT_GAME_FALLBACK_IMAGE,
      imageCandidates: game.imageCandidates?.length
        ? game.imageCandidates
        : [DEFAULT_GAME_FALLBACK_IMAGE],
    };
  });
}
