import "server-only";

import {
  createGameRatingKey,
  getGameRating,
  getGameRatingAggregate,
  getGameRatingsForApp,
  getHelpfulVoteCounts,
  getStatRealmUser,
  getUserHelpfulVotes,
} from "@/lib/db";
import type {
  GameReviewEntry,
  GameReviewsPage,
  ReviewFilterOption,
  ReviewSortOption,
} from "@/lib/reviews/types";

const REVIEWS_PER_PAGE = 20;

function emptySummary() {
  return {
    averageRating: 0,
    totalRatings: 0,
    totalReviews: 0,
    distribution: Array.from({ length: 10 }, () => 0),
  };
}

function applyReviewFilter(
  reviews: GameReviewEntry[],
  filter: ReviewFilterOption,
) {
  switch (filter) {
    case "reviewsWithText":
      return reviews.filter((review) => Boolean(review.reviewText));
    case "ratingsOnly":
      return reviews.filter((review) => !review.reviewText);
    case "ratings8Plus":
      return reviews.filter((review) => review.rating >= 8);
    case "ratingsBelow5":
      return reviews.filter((review) => review.rating < 5);
    default:
      return reviews;
  }
}

function sortReviews(reviews: GameReviewEntry[], sort: ReviewSortOption) {
  const sorted = [...reviews];

  switch (sort) {
    case "mostHelpful":
      sorted.sort(
        (first, second) =>
          second.helpfulCount - first.helpfulCount ||
          Date.parse(second.createdAt) - Date.parse(first.createdAt),
      );
      break;
    case "highestRated":
      sorted.sort(
        (first, second) =>
          second.rating - first.rating ||
          Date.parse(second.createdAt) - Date.parse(first.createdAt),
      );
      break;
    case "lowestRated":
      sorted.sort(
        (first, second) =>
          first.rating - second.rating ||
          Date.parse(second.createdAt) - Date.parse(first.createdAt),
      );
      break;
    case "oldest":
      sorted.sort(
        (first, second) => Date.parse(first.createdAt) - Date.parse(second.createdAt),
      );
      break;
    case "newest":
    default:
      sorted.sort(
        (first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt),
      );
      break;
  }

  return sorted;
}

export async function loadGameReviewsPage(input: {
  appId: number;
  gameName: string;
  page?: number;
  sort?: ReviewSortOption;
  filter?: ReviewFilterOption;
  viewerSteamId?: string | null;
}): Promise<GameReviewsPage> {
  const page = Math.max(1, input.page ?? 1);
  const sort = input.sort ?? "newest";
  const filter = input.filter ?? "all";
  const [aggregate, storedRatings, currentUserRating] = await Promise.all([
    getGameRatingAggregate(input.appId),
    getGameRatingsForApp(input.appId),
    input.viewerSteamId
      ? getGameRating(input.viewerSteamId, input.appId)
      : Promise.resolve(null),
  ]);

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
      const user = await getStatRealmUser(rating.steamId);

      return {
        ratingKey,
        steamId: rating.steamId,
        appId: rating.appId,
        gameName: input.gameName,
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
      } satisfies GameReviewEntry;
    }),
  );

  const filteredReviews = applyReviewFilter(reviews, filter);
  const sortedReviews = sortReviews(filteredReviews, sort);
  const totalMatchingReviews = sortedReviews.length;
  const totalPages = Math.max(1, Math.ceil(totalMatchingReviews / REVIEWS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * REVIEWS_PER_PAGE;

  return {
    summary: aggregate
      ? {
          averageRating: aggregate.averageRating,
          totalRatings: aggregate.totalRatings,
          totalReviews: aggregate.totalReviews,
          distribution: aggregate.distribution,
        }
      : emptySummary(),
    reviews: sortedReviews.slice(pageStart, pageStart + REVIEWS_PER_PAGE),
    totalMatchingReviews,
    page: currentPage,
    pageSize: REVIEWS_PER_PAGE,
    totalPages,
    currentUserRating: currentUserRating
      ? {
          rating: currentUserRating.rating,
          reviewText: currentUserRating.reviewText,
          ratingKey: createGameRatingKey(
            currentUserRating.steamId,
            currentUserRating.appId,
          ),
        }
      : null,
  };
}
