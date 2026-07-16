import "server-only";

import { cache } from "react";
import {
  fetchStoreAppData,
} from "@/lib/steam/store-app-cache";
import {
  isExcludedAppName,
  isPlayableSteamStoreApp,
} from "@/lib/steam/playable-games";
import { getCachedStoreAppRecord } from "@/lib/steam/store-app-cache";
import {
  UNKNOWN_DEVELOPER,
  UNKNOWN_RELEASE_YEAR,
  UNAVAILABLE_REVIEWS,
} from "@/lib/steam/store-metadata-labels";

export {
  UNKNOWN_DEVELOPER,
  UNKNOWN_RELEASE_YEAR,
  UNAVAILABLE_REVIEWS,
} from "@/lib/steam/store-metadata-labels";

function parseDeveloper(data: Record<string, unknown>) {
  const developers = Array.isArray(data.developers)
    ? data.developers.flatMap((entry) =>
        typeof entry === "string" && entry.trim() ? [entry.trim()] : [],
      )
    : [];
  const publishers = Array.isArray(data.publishers)
    ? data.publishers.flatMap((entry) =>
        typeof entry === "string" && entry.trim() ? [entry.trim()] : [],
      )
    : [];

  if (developers.length > 0) {
    return developers.join(", ");
  }

  if (publishers.length > 0) {
    return publishers.join(", ");
  }

  return UNKNOWN_DEVELOPER;
}

function parseReleaseYear(data: Record<string, unknown>) {
  const releaseDate =
    typeof data.release_date === "object" &&
    data.release_date !== null &&
    !Array.isArray(data.release_date)
      ? (data.release_date as Record<string, unknown>)
      : null;

  if (!releaseDate) {
    return UNKNOWN_RELEASE_YEAR;
  }

  if (releaseDate.coming_soon === true) {
    return UNKNOWN_RELEASE_YEAR;
  }

  const dateValue =
    typeof releaseDate.date === "string" ? releaseDate.date.trim() : "";

  if (!dateValue) {
    return UNKNOWN_RELEASE_YEAR;
  }

  const yearMatch = dateValue.match(/\b(19|20)\d{2}\b/);
  return yearMatch?.[0] ?? UNKNOWN_RELEASE_YEAR;
}

function parseReviewSummary(data: Record<string, unknown>) {
  const reviews =
    typeof data.reviews === "object" &&
    data.reviews !== null &&
    !Array.isArray(data.reviews)
      ? (data.reviews as Record<string, unknown>)
      : null;

  if (!reviews) {
    return {
      reviewScore: UNAVAILABLE_REVIEWS,
      reviewPercentage: UNAVAILABLE_REVIEWS,
    };
  }

  const percentPositive = reviews.percent_positive;
  const percentage =
    typeof percentPositive === "number" && Number.isFinite(percentPositive)
      ? `${Math.round(percentPositive)}%`
      : null;

  if (!percentage) {
    return {
      reviewScore: UNAVAILABLE_REVIEWS,
      reviewPercentage: UNAVAILABLE_REVIEWS,
    };
  }

  const description =
    typeof reviews.review_score_desc === "string"
      ? reviews.review_score_desc
      : typeof reviews.summary === "string"
        ? reviews.summary
        : null;

  return {
    reviewPercentage: percentage,
    reviewScore: description
      ? `${percentage} ${description}`
      : percentage,
  };
}

function createUnavailableDetails(appId: number): SteamStoreAppDetails {
  return {
    storeAvailable: false,
    isPlayableGame: false,
    name: `Steam App ${appId}`,
    developer: UNKNOWN_DEVELOPER,
    releaseYear: UNKNOWN_RELEASE_YEAR,
    reviewScore: UNAVAILABLE_REVIEWS,
    reviewPercentage: UNAVAILABLE_REVIEWS,
  };
}

export type SteamStoreAppDetails = {
  storeAvailable: boolean;
  isPlayableGame: boolean;
  name: string;
  developer: string;
  releaseYear: string;
  reviewScore: string;
  reviewPercentage: string;
};

export const getSteamStoreAppDetails = cache(
  async (appId: number): Promise<SteamStoreAppDetails> => {
    const storeApp = await fetchStoreAppData(appId);

    if (!storeApp.success || !storeApp.data) {
      return createUnavailableDetails(appId);
    }

    const data = storeApp.data;
    const reviewSummary = parseReviewSummary(data);
    const appName =
      typeof data.name === "string" && data.name.trim()
        ? data.name.trim()
        : `Steam App ${appId}`;

    return {
      storeAvailable: true,
      isPlayableGame: isPlayableSteamStoreApp(data, appName),
      name: appName,
      developer: parseDeveloper(data),
      releaseYear: parseReleaseYear(data),
      reviewScore: reviewSummary.reviewScore,
      reviewPercentage: reviewSummary.reviewPercentage,
    };
  },
);

export function isPlayableCatalogApp(
  appId: number,
  title: string,
) {
  if (isExcludedAppName(title)) {
    return false;
  }

  const cachedStoreApp = getCachedStoreAppRecord(appId);
  if (!cachedStoreApp) {
    return true;
  }

  if (!cachedStoreApp.success || !cachedStoreApp.data) {
    return false;
  }

  return isPlayableSteamStoreApp(cachedStoreApp.data, title);
}
