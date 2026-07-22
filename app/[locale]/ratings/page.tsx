import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Navbar } from "@/components/Navbar";
import { CommunityRatingsPanel } from "@/components/ratings/CommunityRatingsPanel";
import { loadCommunityRatingsPage } from "@/lib/reviews/community-ratings-page";

type RatingsPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: RatingsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    title: t("ratingsTitle"),
    description: t("ratingsDescription"),
  };
}

export default async function RatingsPage({ params }: RatingsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [ratingsData, t] = await Promise.all([
    loadCommunityRatingsPage(),
    getTranslations("ratingsPage"),
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
            <CommunityRatingsPanel data={ratingsData} locale={locale} />
          </div>
        </div>
      </main>
    </div>
  );
}
