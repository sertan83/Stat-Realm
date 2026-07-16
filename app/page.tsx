import Link from "next/link";
import { auth } from "@/auth";
import { AmbientGlow } from "@/components/AmbientGlow";
import { Hero } from "@/components/Hero";
import { LandingFooter } from "@/components/LandingFooter";
import { SeeYourStatisticsCta } from "@/components/landing/SeeYourStatisticsCta";
import { Navbar } from "@/components/Navbar";
import { getCommunityLandingData } from "@/lib/community/rankings";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [session, communityData] = await Promise.all([
    auth(),
    getCommunityLandingData(),
  ]);

  return (
    <main className="relative min-h-screen text-white">
      <Navbar />
      <Link
        href="/leaderboards"
        className="absolute top-[79px] left-4 z-20 rounded-lg border border-white/10 bg-[#1B2838]/90 px-3.5 py-2 text-sm font-medium text-white shadow-[0_0_24px_rgba(107,47,214,0.12)] backdrop-blur-md transition duration-[250ms] hover:scale-[1.02] hover:bg-[#2A475E]"
      >
        🏆 View Leaderboards
      </Link>
      <Hero
        mostPlayedGames={communityData.mostPlayedGames}
        mostOwnedGames={communityData.mostOwnedGames}
        registeredUserCount={communityData.registeredUserCount}
        communityLeaderboard={communityData.communityLeaderboard}
      />
      <section className="relative flex justify-center overflow-hidden px-4 pb-20 pt-0 lg:px-6">
        <AmbientGlow
          tone="purple"
          className="statrealm-ambient-centered top-1/2 left-1/2 h-[min(72vw,680px)] w-[min(90vw,920px)]"
        />
        <div className="relative z-10 flex max-w-3xl flex-col items-center text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to discover your Steam statistics?
          </h2>
          <p className="mt-4 text-base leading-relaxed text-white/70 sm:text-lg">
            Track your playtime, achievements, completion rates, favorite
            genres, gaming habits, and personalized insights from your entire
            Steam library.
          </p>
          <SeeYourStatisticsCta isAuthenticated={Boolean(session?.user)} />
        </div>
      </section>
      <LandingFooter />
    </main>
  );
}
