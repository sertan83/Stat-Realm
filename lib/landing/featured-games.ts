import "server-only";

import { featuredGames } from "@/data/games";
import { resolveGameListGames } from "@/lib/game-display/game-list";
import type { Game } from "@/types/game";

export async function loadFeaturedGames(): Promise<Game[]> {
  return resolveGameListGames(
    featuredGames.map((game) => ({
      appId: Number(game.id),
      title: game.title,
      category: game.category,
    })),
    { persist: true },
  );
}
