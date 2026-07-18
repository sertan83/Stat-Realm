import type { ReviewGameOption } from "@/lib/reviews/types";

export type CommunityReviewsQuery = {
  page: number;
  selectedAppId: number | null;
};

export function parseCommunityReviewsQuery(
  searchParams: Record<string, string | string[] | undefined>,
): CommunityReviewsQuery {
  const readParam = (key: string) => {
    const value = searchParams[key];
    return typeof value === "string" ? value : "";
  };

  const page = Math.max(1, Number(readParam("page")) || 1);
  const gameParam = readParam("game");
  const parsedAppId = Number(gameParam);
  const selectedAppId =
    gameParam &&
    Number.isInteger(parsedAppId) &&
    parsedAppId > 0
      ? parsedAppId
      : null;

  return {
    page: Number.isFinite(page) ? page : 1,
    selectedAppId,
  };
}

export function buildCommunityReviewsHref(input: {
  page?: number;
  selectedAppId?: number | null;
}) {
  const params = new URLSearchParams();

  if (input.page && input.page > 1) {
    params.set("page", String(input.page));
  }

  if (input.selectedAppId) {
    params.set("game", String(input.selectedAppId));
  }

  const query = params.toString();
  return query ? `/reviews?${query}` : "/reviews";
}
