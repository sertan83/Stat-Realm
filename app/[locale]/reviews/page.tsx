import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { Navbar } from "@/components/Navbar";
import { CommunityReviewsPanel } from "@/components/reviews/CommunityReviewsPanel";
import { parseCommunityReviewsQuery } from "@/lib/reviews/community-reviews-params";
import { loadCommunityReviewsPage } from "@/lib/reviews/community-reviews-page";

type ReviewsPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  params,
}: ReviewsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    title: t("reviewsTitle"),
    description: t("reviewsDescription"),
  };
}

export default async function ReviewsPage({
  params,
  searchParams,
}: ReviewsPageProps) {
  const { locale } = await params;
  const resolvedSearchParams = await searchParams;
  const query = parseCommunityReviewsQuery(resolvedSearchParams);
  setRequestLocale(locale);

  const session = await auth();
  const [reviewsData, t] = await Promise.all([
    loadCommunityReviewsPage({
      page: query.page,
      viewerSteamId: session?.user?.steamId ?? null,
    }),
    getTranslations("reviewsPage"),
  ]);

  return (
    <div className="min-h-screen text-white">
      <Navbar />

      <main className="relative min-h-[calc(100vh-55px)] overflow-hidden px-4 py-12 sm:px-6 lg:px-8">
        <div className="relative z-10 mx-auto w-full max-w-4xl">
          <header>
            <h1 className="text-4xl font-bold tracking-[0.08em] text-white uppercase sm:text-5xl">
              {t("title")}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/65 sm:text-lg">
              {t("subtitle")}
            </p>
          </header>

          <div className="mt-10">
            <CommunityReviewsPanel
              data={reviewsData}
              locale={locale}
              isAuthenticated={Boolean(session?.user)}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
