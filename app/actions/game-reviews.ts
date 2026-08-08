"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  deleteGameRating,
  markReviewHelpful,
  upsertGameRating,
} from "@/lib/db";
import { routing } from "@/i18n/routing";
import { normalizeOptionalReviewText } from "@/lib/reviews/sanitize";
import { userOwnsGameInLibrary } from "@/lib/reviews/library-ownership";
import { parseRatingKey } from "@/lib/security/rating-key";
import {
  assertHelpfulVoteRateLimit,
} from "@/lib/security/request";
import { RateLimitError } from "@/lib/security/rate-limit";
import { resolveGameDisplayName } from "@/lib/steam/game-metadata";
import type { ReviewFilterOption, ReviewSortOption } from "@/lib/reviews/types";

function parseRating(value: number) {
  if (!Number.isFinite(value)) {
    throw new Error("INVALID_RATING");
  }

  const rounded = Math.round(value * 10) / 10;
  if (rounded < 1 || rounded > 10) {
    throw new Error("INVALID_RATING");
  }

  return rounded;
}

function parseAppId(value: number) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("INVALID_APP_ID");
  }

  return value;
}

function revalidateGameReviewPaths(appId: number) {
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/game/${appId}`);
  }
  revalidatePath("/explore");
  revalidatePath("/reviews");
}

export async function submitGameReviewAction(input: {
  appId: number;
  rating: number;
  reviewText?: string | null;
}) {
  const session = await auth();
  const steamId = session?.user?.steamId;

  if (!steamId) {
    throw new Error("UNAUTHORIZED");
  }

  const appId = parseAppId(input.appId);
  const rating = parseRating(input.rating);
  const reviewText = normalizeOptionalReviewText(input.reviewText);

  const ownsGame = await userOwnsGameInLibrary(steamId, appId);
  if (!ownsGame) {
    throw new Error("GAME_NOT_IN_LIBRARY");
  }

  const gameName = await resolveGameDisplayName(appId, { steamId });

  await upsertGameRating({
    steamId,
    appId,
    rating,
    reviewText,
    gameName,
  });

  revalidateGameReviewPaths(appId);
  revalidatePath(`/user/${steamId}`);
}

export async function deleteGameReviewAction(appId: number) {
  const session = await auth();
  const steamId = session?.user?.steamId;

  if (!steamId) {
    throw new Error("UNAUTHORIZED");
  }

  const parsedAppId = parseAppId(appId);
  await deleteGameRating(steamId, parsedAppId);
  revalidateGameReviewPaths(parsedAppId);
  revalidatePath(`/user/${steamId}`);
}

export async function voteReviewHelpfulAction(ratingKey: string, appId: number) {
  const session = await auth();
  const steamId = session?.user?.steamId;

  if (!steamId) {
    throw new Error("UNAUTHORIZED");
  }

  const parsedAppId = parseAppId(appId);
  const { ratingSteamId } = parseRatingKey(ratingKey, parsedAppId);

  if (ratingSteamId === steamId) {
    throw new Error("CANNOT_VOTE_OWN_REVIEW");
  }

  try {
    assertHelpfulVoteRateLimit(steamId);
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw new Error("RATE_LIMIT_HOURLY");
    }

    throw error;
  }

  await markReviewHelpful(steamId, `${ratingSteamId}:${parsedAppId}`);
  revalidateGameReviewPaths(parsedAppId);
}

export type GameReviewsQueryState = {
  page: number;
  sort: ReviewSortOption;
  filter: ReviewFilterOption;
};
