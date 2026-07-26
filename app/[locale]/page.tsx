import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { AmbientGlow } from "@/components/AmbientGlow";
import { Hero } from "@/components/Hero";
import { LandingFooter } from "@/components/LandingFooter";
import { SeeYourStatisticsCta } from "@/components/landing/SeeYourStatisticsCta";
import { getCommunityLandingData } from "@/lib/community/rankings";
import { loadFeaturedGames } from "@/lib/landing/featured-games";

export const dynamic = "force-dynamic";

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

export default async function Home({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [session, communityData, featuredGames, t] = await Promise.all([
    auth(),
    getCommunityLandingData(),
    loadFeaturedGames(),
    getTranslations("landing"),
  ]);

  return (
    <main className="relative min-h-screen text-white">
      <Hero
        featuredGames={featuredGames}
        mostPlayedGames={communityData.mostPlayedGames}
        mostOwnedGames={communityData.mostOwnedGames}
        registeredUserCount={communityData.registeredUserCount}
        communityLeaderboard={communityData.communityLeaderboard}
        topRatedGames={communityData.topRatedGames}
        recentPlayer={communityData.recentPlayer}
        latestReview={communityData.latestReview}
      />
      <section className="relative flex justify-center overflow-hidden px-4 pb-20 pt-0 lg:px-6">
        <AmbientGlow
          tone="purple"
          className="statrealm-ambient-centered top-1/2 left-1/2 h-[min(72vw,680px)] w-[min(90vw,920px)]"
        />
        <div className="relative z-10 flex max-w-3xl flex-col items-center text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {t("ctaTitle")}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-white/70 sm:text-lg">
            {t("ctaDescription")}
          </p>
          <SeeYourStatisticsCta isAuthenticated={Boolean(session?.user)} />
        </div>
      </section>
      <LandingFooter />
    </main>
  );
}
