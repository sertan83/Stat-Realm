import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { AmbientGlow } from "@/components/AmbientGlow";
import { Hero } from "@/components/Hero";
import { LandingFooter } from "@/components/LandingFooter";
import { SeeYourStatisticsCta } from "@/components/landing/SeeYourStatisticsCta";
import { Navbar } from "@/components/Navbar";
import { Link } from "@/i18n/navigation";
import { getCommunityLandingData } from "@/lib/community/rankings";

export const dynamic = "force-dynamic";

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

export default async function Home({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [session, communityData, t] = await Promise.all([
    auth(),
    getCommunityLandingData(),
    getTranslations("landing"),
  ]);

  return (
    <main className="relative min-h-screen text-white">
      <Navbar />
      <div className="absolute top-[79px] left-4 z-20 flex flex-col gap-2.5">
        <Link
          href="/leaderboards"
          className="rounded-lg border border-white/10 bg-[#1B2838]/90 px-3.5 py-2 text-sm font-medium text-white shadow-[0_0_24px_rgba(107,47,214,0.12)] backdrop-blur-md transition duration-[250ms] hover:scale-[1.02] hover:bg-[#2A475E]"
        >
          {t("viewLeaderboards")}
        </Link>
        <Link
          href="/reviews"
          className="rounded-lg border border-white/10 bg-[#1B2838]/90 px-3.5 py-2 text-sm font-medium text-white shadow-[0_0_24px_rgba(107,47,214,0.12)] backdrop-blur-md transition duration-[250ms] hover:scale-[1.02] hover:bg-[#2A475E]"
        >
          {t("viewReviews")}
        </Link>
      </div>
      <Hero
        mostPlayedGames={communityData.mostPlayedGames}
        mostOwnedGames={communityData.mostOwnedGames}
        registeredUserCount={communityData.registeredUserCount}
        communityLeaderboard={communityData.communityLeaderboard}
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
