import "server-only";

import { saveUserProfileAnalytics } from "@/lib/db";
import { enrichDashboardGamesWithSteamImages } from "@/lib/steam/game-images";

const inFlightImageEnrichment = new Map<string, Promise<number>>();

export async function enrichMissingDashboardGameImagesInBackground(
  steamId: string,
  games: Array<{
    id: string;
    title: string;
    imageUrl: string;
    imageFallbackUrl?: string;
    imageCandidates?: string[];
  }>,
) {
  if (games.length === 0) {
    return 0;
  }

  const existingSync = inFlightImageEnrichment.get(steamId);
  if (existingSync) {
    return existingSync;
  }

  const sync = (async () => {
    await enrichDashboardGamesWithSteamImages(games, { steamId });
    await saveUserProfileAnalytics(steamId, {});
    return games.length;
  })()
    .catch((error) => {
      console.error(
        "[StatRealm] Failed to enrich dashboard game images in background",
        { steamId, appIds: games.map((game) => game.id), error },
      );
      return 0;
    })
    .finally(() => {
      inFlightImageEnrichment.delete(steamId);
    });

  inFlightImageEnrichment.set(steamId, sync);
  return sync;
}
