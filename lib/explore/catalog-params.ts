export type ExploreCatalogQuery = {
  page: number;
  term: string;
  genre: string;
  platform: string;
  sortBy: string;
  hideDlc: boolean;
};

export function parseExploreCatalogQuery(
  searchParams: Record<string, string | string[] | undefined>,
): ExploreCatalogQuery {
  const readParam = (key: string) => {
    const value = searchParams[key];
    return typeof value === "string" ? value : "";
  };

  const page = Math.max(1, Number(readParam("page")) || 1);

  return {
    page: Number.isFinite(page) ? page : 1,
    term: readParam("q").trim(),
    genre: readParam("genre"),
    platform: readParam("platform"),
    sortBy: readParam("sort"),
    hideDlc: readParam("hideDlc") === "1",
  };
}

export function getExplorePageNumbers(
  currentPage: number,
  totalPages: number,
  maxVisible = 9,
) {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const halfWindow = Math.floor(maxVisible / 2);
  let start = Math.max(1, currentPage - halfWindow);
  let end = start + maxVisible - 1;

  if (end > totalPages) {
    end = totalPages;
    start = Math.max(1, end - maxVisible + 1);
  }

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}
