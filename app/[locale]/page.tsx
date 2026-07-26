import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { Hero } from "@/components/Hero";
import { LandingFooter } from "@/components/LandingFooter";
import { getCommunityLandingData } from "@/lib/community/rankings";
import { loadFeaturedGames } from "@/lib/landing/featured-games";

export const dynamic = "force-dynamic";

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

export default async function Home({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [session, communityData, featuredGames] = await Promise.all([
    auth(),
    getCommunityLandingData(),
    loadFeaturedGames(),
  ]);

  return (
    <main className="relative min-h-screen w-full max-w-full overflow-x-hidden text-white">
      <Hero
        featuredGames={featuredGames}
        mostPlayedGames={communityData.mostPlayedGames}
        mostOwnedGames={communityData.mostOwnedGames}
        registeredUserCount={communityData.registeredUserCount}
        communityLeaderboard={communityData.communityLeaderboard}
        topRatedGames={communityData.topRatedGames}
        recentPlayer={communityData.recentPlayer}
        latestReview={communityData.latestReview}
        isAuthenticated={Boolean(session?.user)}
      />
      <LandingFooter />
    </main>
  );
}
