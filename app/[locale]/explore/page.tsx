import { getTranslations, setRequestLocale } from "next-intl/server";
import { Navbar } from "@/components/Navbar";
import { ExploreCatalog } from "@/components/ExploreCatalog";
import {
  fetchExploreCatalog,
  parseExploreCatalogQuery,
} from "@/lib/steam/store-catalog";

type ExplorePageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ExplorePage({
  params,
  searchParams,
}: ExplorePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [resolvedSearchParams, t] = await Promise.all([
    searchParams,
    getTranslations("explore"),
  ]);
  const query = parseExploreCatalogQuery(resolvedSearchParams);
  const catalog = await fetchExploreCatalog(query).catch((error) => {
    console.error("[Steam Explore Catalog] Failed to load page", error);
    return {
      games: [],
      totalCount: 0,
      page: query.page,
      pageSize: 24,
      totalPages: 1,
    };
  });

  return (
    <div className="min-h-screen text-white">
      <Navbar />

      <main className="relative min-h-[calc(100vh-55px)] overflow-hidden px-4 py-12 sm:px-6 lg:px-8">
        <div className="relative z-10 mx-auto w-full max-w-7xl">
          <header>
            <h1 className="text-4xl font-bold tracking-[0.08em] text-white uppercase sm:text-5xl lg:text-6xl">
              {t("title")}
            </h1>
          </header>

          <ExploreCatalog
            games={catalog.games}
            totalCount={catalog.totalCount}
            currentPage={catalog.page}
            totalPages={catalog.totalPages}
            query={query.term}
            genre={query.genre}
            platform={query.platform}
            sortBy={query.sortBy}
            hideDlc={query.hideDlc}
          />
        </div>
      </main>
    </div>
  );
}
