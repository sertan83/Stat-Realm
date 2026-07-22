import "server-only";

import { getGameRatingAggregate, getUserGameRatings } from "@/lib/db";
import type { UserRatingsPageData } from "@/lib/reviews/types";
import { getSteamBannerImageCandidates } from "@/lib/steam/game-images";

function buildGameHeaderImageUrl(appId: number) {
  const bannerCandidates = getSteamBannerImageCandidates(appId);

  return (
    bannerCandidates[0]?.url ??
    `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`
  );
}

export async function loadUserRatingsPage(
  steamId: string,
): Promise<UserRatingsPageData> {
  const storedRatings = await getUserGameRatings(steamId);

  const sortedRatings = [...storedRatings].sort(
    (first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt),
  );

  const ratings = await Promise.all(
    sortedRatings.map(async (rating) => {
      const aggregate = await getGameRatingAggregate(rating.appId);

      return {
        appId: rating.appId,
        gameName: aggregate?.gameName ?? `Steam App ${rating.appId}`,
        imageUrl: buildGameHeaderImageUrl(rating.appId),
        rating: rating.rating,
        createdAt: rating.createdAt,
      };
    }),
  );

  return {
    ratings,
    totalRatings: ratings.length,
  };
}
