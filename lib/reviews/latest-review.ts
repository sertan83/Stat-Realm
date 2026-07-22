import "server-only";

import {
  createGameRatingKey,
  getLatestGameReviewWithText,
  getStatRealmUser,
} from "@/lib/db";
import { resolveGameDisplay } from "@/lib/game-display/resolve";
import { DEFAULT_GAME_FALLBACK_IMAGE } from "@/lib/steam/image-constants";

const REVIEW_PREVIEW_LENGTH = 120;

export type LandingLatestReview = {
  ratingKey: string;
  steamId: string;
  appId: number;
  gameName: string;
  gameHeaderImageUrl: string;
  imageCandidates: string[];
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

  const [user, display] = await Promise.all([
    getStatRealmUser(latestReview.steamId),
    resolveGameDisplay(latestReview.appId, {
      imageVariant: "header",
      persist: true,
    }),
  ]);

  return {
    ratingKey: createGameRatingKey(latestReview.steamId, latestReview.appId),
    steamId: latestReview.steamId,
    appId: latestReview.appId,
    gameName: display.name,
    gameHeaderImageUrl: display.imageUrl || DEFAULT_GAME_FALLBACK_IMAGE,
    imageCandidates: display.headerImageCandidates,
    reviewerName:
      user?.displayName ?? `Steam User ${latestReview.steamId.slice(-4)}`,
    reviewerAvatarUrl: user?.avatarUrl ?? user?.avatar ?? "",
    rating: latestReview.rating,
    reviewPreview: buildReviewPreview(latestReview.reviewText),
    createdAt: latestReview.createdAt,
  };
}
