import "server-only";

import { getUserGameRatings } from "@/lib/db";
import { attachResolvedGameImages } from "@/lib/reviews/attach-game-images";
import { attachResolvedGameNames } from "@/lib/reviews/attach-game-names";
import type { UserRatingsPageData } from "@/lib/reviews/types";
import { DEFAULT_GAME_FALLBACK_IMAGE } from "@/lib/steam/image-constants";

export async function loadUserRatingsPage(
  steamId: string,
): Promise<UserRatingsPageData> {
  const storedRatings = await getUserGameRatings(steamId);

  const sortedRatings = [...storedRatings].sort(
    (first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt),
  );

  const ratingsWithNames = await attachResolvedGameNames(
    sortedRatings.map((rating) => ({
      appId: rating.appId,
      rating: rating.rating,
      createdAt: rating.createdAt,
    })),
    { steamId },
  );

  const ratingsWithImages = await attachResolvedGameImages(ratingsWithNames, {
    variant: "card",
  });

  const ratings = ratingsWithImages.map((rating) => ({
    appId: rating.appId,
    gameName: rating.gameName,
    imageUrl: rating.imageCandidates[0] ?? DEFAULT_GAME_FALLBACK_IMAGE,
    imageCandidates: rating.imageCandidates,
    rating: rating.rating,
    createdAt: rating.createdAt,
  }));

  return {
    ratings,
    totalRatings: ratings.length,
  };
}
