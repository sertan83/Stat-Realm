import "server-only";

import { GAME_NAME_LOADING_LABEL } from "@/lib/game-metadata/constants";
import { resolveGameMetadataBatch } from "@/lib/steam/game-metadata";

export async function attachResolvedGameNames<
  T extends {
    appId: number;
    gameName?: string;
  },
>(entries: T[], options?: { steamId?: string | null }) {
  if (entries.length === 0) {
    return [];
  }

  const names = await resolveGameMetadataBatch(
    entries.map((entry) => entry.appId),
    options,
  );

  return entries.map((entry) => ({
    ...entry,
    gameName: names.get(entry.appId) ?? GAME_NAME_LOADING_LABEL,
  }));
}
