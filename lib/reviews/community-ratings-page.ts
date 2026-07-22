import "server-only";

import { getAllRatingAggregates } from "@/lib/db";
import { attachGameListDisplay } from "@/lib/game-display/game-list";
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

  const ratings = (
    await attachGameListDisplay(
      sortedAggregates.map((aggregate) => ({
        appId: aggregate.appId,
        averageRating: aggregate.averageRating,
        totalRatings: aggregate.totalRatings,
        totalReviews: aggregate.totalReviews,
      })),
    )
  ).map((entry) => ({
    appId: entry.appId,
    gameName: entry.gameName,
    imageCandidates: entry.imageCandidates,
    averageRating: entry.averageRating,
    totalRatings: entry.totalRatings,
    totalReviews: entry.totalReviews,
  }));

  return {
    ratings,
    totalGames: ratings.length,
  };
}
