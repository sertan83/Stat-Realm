import "server-only";

import {
  createGameRatingKey,
  getGameRatingAggregate,
  getHelpfulVoteCounts,
  getStatRealmUser,
  getUserGameRatings,
  getUserHelpfulVotes,
} from "@/lib/db";
import type { UserProfileReviewsPage } from "@/lib/reviews/types";

const REVIEWS_PER_PAGE = 20;

export async function loadUserProfileReviewsPage(input: {
  steamId: string;
  page?: number;
  viewerSteamId?: string | null;
}): Promise<UserProfileReviewsPage> {
  const page = Math.max(1, input.page ?? 1);
  const storedRatings = await getUserGameRatings(input.steamId);
  const user = await getStatRealmUser(input.steamId);
  const ratingKeys = storedRatings.map((rating) =>
    createGameRatingKey(rating.steamId, rating.appId),
  );
  const [helpfulCounts, votedKeys] = await Promise.all([
    getHelpfulVoteCounts(ratingKeys),
    input.viewerSteamId
      ? getUserHelpfulVotes(input.viewerSteamId, ratingKeys)
      : Promise.resolve(new Set<string>()),
  ]);

  const reviews = await Promise.all(
    storedRatings.map(async (rating) => {
      const ratingKey = createGameRatingKey(rating.steamId, rating.appId);
      const aggregate = await getGameRatingAggregate(rating.appId);
      const gameName = aggregate?.gameName ?? `Steam App ${rating.appId}`;

      return {
        ratingKey,
        steamId: rating.steamId,
        appId: rating.appId,
        gameName,
        displayName: user?.displayName ?? `Steam User ${rating.steamId.slice(-4)}`,
        avatarUrl: user?.avatarUrl ?? user?.avatar ?? "",
        profileUrl:
          user?.profileUrl ??
          `https://steamcommunity.com/profiles/${rating.steamId}`,
        steamLevel: user?.stats.steamLevel ?? null,
        rating: rating.rating,
        reviewText: rating.reviewText,
        createdAt: rating.createdAt,
        updatedAt: rating.updatedAt,
        editedAt: rating.editedAt,
        helpfulCount: helpfulCounts[ratingKey] ?? 0,
        hasVotedHelpful: votedKeys.has(ratingKey),
      };
    }),
  );

  const sortedReviews = reviews.sort(
    (first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt),
  );

  const totalReviews = sortedReviews.length;
  const totalPages = Math.max(1, Math.ceil(totalReviews / REVIEWS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * REVIEWS_PER_PAGE;

  return {
    reviews: sortedReviews.slice(pageStart, pageStart + REVIEWS_PER_PAGE),
    totalReviews,
    page: currentPage,
    pageSize: REVIEWS_PER_PAGE,
    totalPages,
  };
}
