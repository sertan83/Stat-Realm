import "server-only";

import type { ExploreCatalogQuery } from "@/lib/explore/catalog-params";
import { getAllRatingAggregates } from "@/lib/db";
import {
  buildExploreGames,
  type ExploreCatalogResult,
} from "@/lib/steam/store-catalog";

const GAMES_PER_PAGE = 24;

function filterAggregatesByTerm(
  aggregates: Awaited<ReturnType<typeof getAllRatingAggregates>>,
  term: string,
) {
  const normalizedTerm = term.trim().toLowerCase();
  if (!normalizedTerm) {
    return aggregates;
  }

  return aggregates.filter((aggregate) =>
    aggregate.gameName.toLowerCase().includes(normalizedTerm),
  );
}

export async function fetchStatRealmRatedCatalog(
  query: ExploreCatalogQuery,
): Promise<ExploreCatalogResult> {
  const aggregates = filterAggregatesByTerm(
    await getAllRatingAggregates(),
    query.term,
  ).filter((aggregate) => aggregate.totalRatings > 0);

  const sortedAggregates = [...aggregates].sort((first, second) => {
    if (query.sortBy === "Most Reviewed") {
      return (
        second.totalReviews - first.totalReviews ||
        second.totalRatings - first.totalRatings ||
        second.averageRating - first.averageRating
      );
    }

    return (
      second.averageRating - first.averageRating ||
      second.totalRatings - first.totalRatings ||
      second.totalReviews - first.totalReviews
    );
  });

  const totalCount = sortedAggregates.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / GAMES_PER_PAGE));
  const page = Math.min(query.page, totalPages);
  const pageStart = (page - 1) * GAMES_PER_PAGE;
  const pageAggregates = sortedAggregates.slice(
    pageStart,
    pageStart + GAMES_PER_PAGE,
  );

  const games = await buildExploreGames(
    pageAggregates.map((aggregate) => ({
      appId: aggregate.appId,
      title: aggregate.gameName,
      category: "StatRealm Rated",
    })),
  );

  return {
    games,
    totalCount,
    page,
    pageSize: GAMES_PER_PAGE,
    totalPages,
  };
}
