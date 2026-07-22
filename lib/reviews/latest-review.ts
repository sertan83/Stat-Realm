import "server-only";

import {
  createGameRatingKey,
  getLatestGameReviewWithText,
  getStatRealmUser,
} from "@/lib/db";
import { resolveGameDisplayName } from "@/lib/steam/game-metadata";
import { getSteamBannerImageCandidates } from "@/lib/steam/game-images";

const REVIEW_PREVIEW_LENGTH = 120;

export type LandingLatestReview = {
  ratingKey: string;
  steamId: string;
  appId: number;
  gameName: string;
  gameHeaderImageUrl: string;
  reviewerName: string;
  reviewerAvatarUrl: string;
  rating: number;
  reviewPreview: string;
  createdAt: string;
};

function buildReviewPreview(reviewText: string) {
  if (reviewText.length <= REVIEW_PREVIEW_LENGTH) {
    return reviewText;
  }

  return `${reviewText.slice(0, REVIEW_PREVIEW_LENGTH).trimEnd()}...`;
}

export async function getLatestLandingReview(): Promise<LandingLatestReview | null> {
  const latestReview = await getLatestGameReviewWithText();

  if (!latestReview?.reviewText) {
    return null;
  }

  const [user, gameName] = await Promise.all([
    getStatRealmUser(latestReview.steamId),
    resolveGameDisplayName(latestReview.appId),
  ]);
  const bannerCandidates = getSteamBannerImageCandidates(latestReview.appId);

  return {
    ratingKey: createGameRatingKey(latestReview.steamId, latestReview.appId),
    steamId: latestReview.steamId,
    appId: latestReview.appId,
    gameName,
    gameHeaderImageUrl:
      bannerCandidates[0]?.url ??
      `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${latestReview.appId}/header.jpg`,
    reviewerName:
      user?.displayName ?? `Steam User ${latestReview.steamId.slice(-4)}`,
    reviewerAvatarUrl: user?.avatarUrl ?? user?.avatar ?? "",
    rating: latestReview.rating,
    reviewPreview: buildReviewPreview(latestReview.reviewText),
    createdAt: latestReview.createdAt,
  };
}
