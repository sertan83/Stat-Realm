import type { ReviewFilterOption, ReviewSortOption } from "@/lib/reviews/types";

const REVIEW_SORT_OPTIONS: ReviewSortOption[] = [
  "mostHelpful",
  "highestRated",
  "lowestRated",
  "newest",
  "oldest",
];

const REVIEW_FILTER_OPTIONS: ReviewFilterOption[] = [
  "all",
  "reviewsWithText",
  "ratingsOnly",
  "ratings8Plus",
  "ratingsBelow5",
];

export function parseGameReviewsQuery(
  searchParams: Record<string, string | string[] | undefined>,
) {
  const readParam = (key: string) => {
    const value = searchParams[key];
    return typeof value === "string" ? value : "";
  };

  const page = Math.max(1, Number(readParam("reviewPage")) || 1);
  const sortParam = readParam("reviewSort");
  const filterParam = readParam("reviewFilter");

  return {
    page: Number.isFinite(page) ? page : 1,
    sort: REVIEW_SORT_OPTIONS.includes(sortParam as ReviewSortOption)
      ? (sortParam as ReviewSortOption)
      : "newest",
    filter: REVIEW_FILTER_OPTIONS.includes(filterParam as ReviewFilterOption)
      ? (filterParam as ReviewFilterOption)
      : "all",
  };
}
