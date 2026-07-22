import "server-only";

import { featuredGames } from "@/data/games";
import {
  gameDisplayToGame,
  resolveGameDisplayBatch,
} from "@/lib/game-display/resolve";
import type { Game } from "@/types/game";

export async function loadFeaturedGames(): Promise<Game[]> {
  const displays = await resolveGameDisplayBatch(
    featuredGames.map((game) => ({ appId: Number(game.id) })),
    { imageVariant: "card", persist: true },
  );

  return featuredGames.map((staticGame) => {
    const display = displays.get(Number(staticGame.id));

    if (!display) {
      return staticGame;
    }

    return gameDisplayToGame(display, staticGame.category);
  });
}
