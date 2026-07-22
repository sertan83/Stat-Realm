import "server-only";

import { getUserGameRatings } from "@/lib/db";
import { attachGameListDisplay } from "@/lib/game-display/game-list";
import type { UserRatingsPageData } from "@/lib/reviews/types";
import { DEFAULT_GAME_FALLBACK_IMAGE } from "@/lib/steam/image-constants";

export async function loadUserRatingsPage(
  steamId: string,
): Promise<UserRatingsPageData> {
  const storedRatings = await getUserGameRatings(steamId);

  const sortedRatings = [...storedRatings].sort(
    (first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt),
  );

  const ratings = (
    await attachGameListDisplay(
      sortedRatings.map((rating) => ({
        appId: rating.appId,
        rating: rating.rating,
        createdAt: rating.createdAt,
      })),
      { steamId },
    )
  ).map((rating) => ({
    appId: rating.appId,
    gameName: rating.gameName,
    imageUrl: rating.imageUrl || DEFAULT_GAME_FALLBACK_IMAGE,
    imageCandidates: rating.imageCandidates,
    rating: rating.rating,
    createdAt: rating.createdAt,
  }));

  return {
    ratings,
    totalRatings: ratings.length,
  };
}
