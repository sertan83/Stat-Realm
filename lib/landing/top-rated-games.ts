import "server-only";

import { getAllRatingAggregates } from "@/lib/db";
import { attachGameListDisplay } from "@/lib/game-display/game-list";

export type LandingTopRatedGame = {
  rank: number;
  appId: number;
  gameName: string;
  imageUrl: string;
  imageCandidates: string[];
  averageRating: number;
};

export async function getTopRatedLandingGames(
  limit = 3,
): Promise<LandingTopRatedGame[]> {
  const aggregates = (await getAllRatingAggregates()).filter(
    (aggregate) => aggregate.totalRatings > 0,
  );

  const sortedAggregates = [...aggregates].sort(
    (first, second) =>
      second.averageRating - first.averageRating ||
      second.totalRatings - first.totalRatings ||
      second.totalReviews - first.totalReviews,
  );

  const topAggregates = sortedAggregates.slice(0, limit);

  if (topAggregates.length === 0) {
    return [];
  }

  const enriched = await attachGameListDisplay(
    topAggregates.map((aggregate) => ({
      appId: aggregate.appId,
      averageRating: aggregate.averageRating,
    })),
  );

  return topAggregates.map((aggregate, index) => {
    const entry = enriched[index];

    return {
      rank: index + 1,
      appId: aggregate.appId,
      gameName: entry.gameName,
      imageUrl: entry.imageUrl,
      imageCandidates: entry.imageCandidates,
      averageRating: aggregate.averageRating,
    };
  });
}
