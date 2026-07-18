export type CommunityReviewsQuery = {
  page: number;
};

export function parseCommunityReviewsQuery(
  searchParams: Record<string, string | string[] | undefined>,
): CommunityReviewsQuery {
  const readParam = (key: string) => {
    const value = searchParams[key];
    return typeof value === "string" ? value : "";
  };

  const page = Math.max(1, Number(readParam("page")) || 1);

  return {
    page: Number.isFinite(page) ? page : 1,
  };
}

export function buildCommunityReviewsHref(input: { page?: number }) {
  const params = new URLSearchParams();

  if (input.page && input.page > 1) {
    params.set("page", String(input.page));
  }

  const query = params.toString();
  return query ? `/reviews?${query}` : "/reviews";
}
