import "server-only";

import {
  createGameRatingKey,
  getAllGameReviewsWithText,
  getGameRatingAggregate,
  getHelpfulVoteCounts,
  getStatRealmUser,
  getUserHelpfulVotes,
} from "@/lib/db";
import type {
  CommunityReviewEntry,
  CommunityReviewsPageData,
} from "@/lib/reviews/types";
import { getSteamBannerImageCandidates } from "@/lib/steam/game-images";

const REVIEWS_PER_PAGE = 10;

function buildGameHeaderImageUrl(appId: number) {
  const bannerCandidates = getSteamBannerImageCandidates(appId);

  return (
    bannerCandidates[0]?.url ??
    `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`
  );
}

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

  const reviews = await Promise.all(
    sortedRatings.map(async (rating) => {
      const ratingKey = createGameRatingKey(rating.steamId, rating.appId);
      const [user, aggregate] = await Promise.all([
        getStatRealmUser(rating.steamId),
        getGameRatingAggregate(rating.appId),
      ]);

      return {
        ratingKey,
        steamId: rating.steamId,
        appId: rating.appId,
        gameName: aggregate?.gameName ?? `Steam App ${rating.appId}`,
        gameHeaderImageUrl: buildGameHeaderImageUrl(rating.appId),
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
      } satisfies CommunityReviewEntry;
    }),
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
