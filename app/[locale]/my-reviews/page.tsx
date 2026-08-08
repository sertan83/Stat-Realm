import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { CommunityReviewsPanel } from "@/components/reviews/CommunityReviewsPanel";
import { redirect } from "@/i18n/navigation";
import { parseMyReviewsQuery } from "@/lib/reviews/my-reviews-params";
import { loadMyReviewsPage } from "@/lib/reviews/my-reviews-page";

type MyReviewsPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  params,
}: MyReviewsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "myReviewsPage" });

  return {
    title: t("metadataTitle"),
    description: t("metadataDescription"),
  };
}

export default async function MyReviewsPage({
  params,
  searchParams,
}: MyReviewsPageProps) {
  const { locale } = await params;
  const resolvedSearchParams = await searchParams;
  const query = parseMyReviewsQuery(resolvedSearchParams);
  setRequestLocale(locale);

  const session = await auth();

  if (!session?.user?.steamId) {
    redirect({ href: "/", locale });
  }

  const steamId = session!.user!.steamId;

  const [reviewsData, t] = await Promise.all([
    loadMyReviewsPage({
      steamId,
      page: query.page,
      viewerSteamId: steamId,
    }),
    getTranslations("myReviewsPage"),
  ]);

  return (
    <div className="min-h-screen text-white">
      <main className="relative min-h-[calc(100vh-55px)] overflow-hidden px-4 py-12 sm:px-6 lg:px-8">
        <div className="relative z-10 mx-auto w-full max-w-4xl">
          <header>
            <h1 className="text-4xl font-bold tracking-[0.08em] text-white uppercase sm:text-5xl">
              {t("title")}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/65 sm:text-lg">
              {reviewsData.totalReviews > 0
                ? t("subtitleWithCount", { count: reviewsData.totalReviews })
                : t("subtitle")}
            </p>
          </header>

          <div className="mt-10">
            <CommunityReviewsPanel
              data={reviewsData}
              locale={locale}
              isAuthenticated
              translationsNamespace="myReviewsPage"
              paginationVariant="my"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
