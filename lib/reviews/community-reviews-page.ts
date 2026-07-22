import "server-only";

import {
  createGameRatingKey,
  getAllGameReviewsWithText,
  getHelpfulVoteCounts,
  getStatRealmUser,
  getUserHelpfulVotes,
} from "@/lib/db";
import { attachResolvedGameImages } from "@/lib/reviews/attach-game-images";
import { attachResolvedGameNames } from "@/lib/reviews/attach-game-names";
import type {
  CommunityReviewEntry,
  CommunityReviewsPageData,
} from "@/lib/reviews/types";
import { DEFAULT_GAME_FALLBACK_IMAGE } from "@/lib/steam/image-constants";

const REVIEWS_PER_PAGE = 10;

export async function loadCommunityReviewsPage(input: {
  page?: number;
  viewerSteamId?: string | null;
}): Promise<CommunityReviewsPageData> {
  const page = Math.max(1, input.page ?? 1);
  const storedRatings = await getAllGameReviewsWithText();

  const sortedRatings = [...storedRatings].sort(
    (first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt),
  );

  const ratingKeys = sortedRatings.map((rating) =>
    createGameRatingKey(rating.steamId, rating.appId),
  );
  const helpfulCounts = await getHelpfulVoteCounts(ratingKeys);
  const votedKeys =
    input.viewerSteamId && ratingKeys.length > 0
      ? await getUserHelpfulVotes(input.viewerSteamId, ratingKeys)
      : new Set<string>();

  const reviewEntries = await Promise.all(
    sortedRatings.map(async (rating) => {
      const ratingKey = createGameRatingKey(rating.steamId, rating.appId);
      const user = await getStatRealmUser(rating.steamId);

      return {
        ratingKey,
        steamId: rating.steamId,
        appId: rating.appId,
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

  const reviewsWithImages = await attachResolvedGameImages(
    await attachResolvedGameNames(reviewEntries),
    { variant: "header" },
  );

  const reviews = reviewsWithImages.map(
    (review) =>
      ({
        ...review,
        gameName: review.gameName,
        gameHeaderImageUrl:
          review.imageCandidates[0] ?? DEFAULT_GAME_FALLBACK_IMAGE,
        imageCandidates: review.imageCandidates,
      }) satisfies CommunityReviewEntry,
  );

  const totalReviews = reviews.length;
  const totalPages = Math.max(1, Math.ceil(totalReviews / REVIEWS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * REVIEWS_PER_PAGE;

  return {
    reviews: reviews.slice(pageStart, pageStart + REVIEWS_PER_PAGE),
    totalReviews,
    page: currentPage,
    pageSize: REVIEWS_PER_PAGE,
    totalPages,
  };
}
