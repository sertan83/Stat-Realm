import "server-only";

import { getAllRatingAggregates } from "@/lib/db";
import { attachResolvedGameNames } from "@/lib/reviews/attach-game-names";
import type { CommunityRatingsPageData } from "@/lib/reviews/types";

export async function loadCommunityRatingsPage(): Promise<CommunityRatingsPageData> {
  const aggregates = (await getAllRatingAggregates()).filter(
    (aggregate) => aggregate.totalRatings > 0,
  );

  const sortedAggregates = [...aggregates].sort(
    (first, second) =>
      second.averageRating - first.averageRating ||
      second.totalRatings - first.totalRatings ||
      second.totalReviews - first.totalReviews,
  );

  const ratingsWithNames = await attachResolvedGameNames(
    sortedAggregates.map((aggregate) => ({
      appId: aggregate.appId,
      gameName: aggregate.gameName,
      averageRating: aggregate.averageRating,
      totalRatings: aggregate.totalRatings,
      totalReviews: aggregate.totalReviews,
    })),
  );

  const ratings = ratingsWithNames.map((entry) => ({
    appId: entry.appId,
    gameName: entry.gameName,
    averageRating: entry.averageRating,
    totalRatings: entry.totalRatings,
    totalReviews: entry.totalReviews,
  }));

  return {
    ratings,
    totalGames: ratings.length,
  };
}
