"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ExploreFilters } from "@/components/ExploreFilters";
import { ExploreGameCard } from "@/components/ExploreGameCard";
import { getExplorePageNumbers } from "@/lib/explore/catalog-params";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Game } from "@/types/game";

type ExploreCatalogProps = {
  games: Game[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  query: string;
  genre: string;
  platform: string;
  sortBy: string;
  hideDlc: boolean;
};

function buildExploreSearchParams({
  page,
  query,
  genre,
  platform,
  sortBy,
  hideDlc,
}: {
  page: number;
  query: string;
  genre: string;
  platform: string;
  sortBy: string;
  hideDlc: boolean;
}) {
  const params = new URLSearchParams();

  if (page > 1) params.set("page", String(page));
  if (query.trim()) params.set("q", query.trim());
  if (genre) params.set("genre", genre);
  if (platform) params.set("platform", platform);
  if (sortBy) params.set("sort", sortBy);
  if (hideDlc) params.set("hideDlc", "1");

  return params;
}

export function ExploreCatalog({
  games,
  totalCount,
  currentPage,
  totalPages,
  query,
  genre,
  platform,
  sortBy,
  hideDlc,
}: ExploreCatalogProps) {
  const t = useTranslations("explore");
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState(query);

  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (searchInput.trim() === query.trim()) return;

      const params = buildExploreSearchParams({
        page: 1,
        query: searchInput,
        genre,
        platform,
        sortBy,
        hideDlc,
      });

      startTransition(() => {
        router.push(
          params.size > 0 ? `${pathname}?${params.toString()}` : pathname,
        );
      });
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [
    genre,
    hideDlc,
    pathname,
    platform,
    query,
    router,
    searchInput,
    sortBy,
  ]);

  const pages = useMemo(
    () => getExplorePageNumbers(currentPage, totalPages),
    [currentPage, totalPages],
  );

  function navigateCatalog(updates: {
    page?: number;
    query?: string;
    genre?: string;
    platform?: string;
    sortBy?: string;
    hideDlc?: boolean;
  }) {
    const params = buildExploreSearchParams({
      page: updates.page ?? currentPage,
      query: updates.query ?? query,
      genre: updates.genre ?? genre,
      platform: updates.platform ?? platform,
      sortBy: updates.sortBy ?? sortBy,
      hideDlc: updates.hideDlc ?? hideDlc,
    });

    startTransition(() => {
      router.push(
        params.size > 0 ? `${pathname}?${params.toString()}` : pathname,
      );
    });
  }

  return (
    <>
      <ExploreFilters
        query={searchInput}
        genre={genre}
        platform={platform}
        sortBy={sortBy}
        hideDlc={hideDlc}
        onQueryChange={setSearchInput}
        onGenreChange={(value) => navigateCatalog({ page: 1, genre: value })}
        onPlatformChange={(value) =>
          navigateCatalog({ page: 1, platform: value })
        }
        onSortByChange={(value) => navigateCatalog({ page: 1, sortBy: value })}
        onHideDlcChange={(value) => navigateCatalog({ page: 1, hideDlc: value })}
      />

      {games.length > 0 ? (
        <>
          <section
            aria-label={t("gamesAriaLabel")}
            className={`mt-10 grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${
              isPending ? "opacity-70" : ""
            }`}
          >
            {games.map((game) => (
              <ExploreGameCard key={game.id} game={game} />
            ))}
          </section>

          <nav
            aria-label={t("paginationAriaLabel")}
            className="mt-14 flex flex-wrap items-center justify-center gap-2 pb-4"
          >
            {currentPage === 1 ? (
              <span
                aria-disabled="true"
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/35"
              >
                {t("previous")}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => navigateCatalog({ page: currentPage - 1 })}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                {t("previous")}
              </button>
            )}

            {pages.map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => navigateCatalog({ page })}
                aria-current={page === currentPage ? "page" : undefined}
                className={
                  page === currentPage
                    ? "flex h-10 w-10 items-center justify-center rounded-lg bg-[#E2363C] text-sm font-semibold text-white shadow-[0_0_24px_rgba(226,54,60,0.3)]"
                    : "flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-sm text-white/70 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                }
              >
                {page}
              </button>
            ))}

            {currentPage === totalPages ? (
              <span
                aria-disabled="true"
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/35"
              >
                {t("next")}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => navigateCatalog({ page: currentPage + 1 })}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                {t("next")}
              </button>
            )}
          </nav>
        </>
      ) : (
        <div
          role="status"
          className="mt-10 flex min-h-52 items-center justify-center text-center text-white/70"
        >
          {totalCount > 0 ? t("noGamesOnPage") : t("noGamesFound")}
        </div>
      )}
    </>
  );
}
