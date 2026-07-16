import "server-only";

import { cache } from "react";
import {
  getSteamStoreAppDetails,
} from "@/lib/steam/store-app-details";
import { UNAVAILABLE_REVIEWS } from "@/lib/steam/store-metadata-labels";

export type SteamStoreReviewSummary = {
  percentage: string;
  reviewScore: string;
};

export const getSteamStoreReviewSummary = cache(
  async (appId: number): Promise<SteamStoreReviewSummary | null> => {
    const details = await getSteamStoreAppDetails(appId);

    if (details.reviewPercentage === UNAVAILABLE_REVIEWS) {
      return null;
    }

    return {
      percentage: details.reviewPercentage,
      reviewScore: details.reviewScore,
    };
  },
);
