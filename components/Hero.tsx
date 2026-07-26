"use client";

import { useTranslations } from "next-intl";
import { AmbientGlow } from "@/components/AmbientGlow";
import { BackgroundGlow } from "@/components/BackgroundGlow";
import { CommunityLeaderboard } from "@/components/CommunityLeaderboard";
import { CommunityTopGames } from "@/components/CommunityTopGames";
import { GameGrid } from "@/components/GameGrid";
import { LandingCommunitySidebar } from "@/components/landing/LandingCommunitySidebar";
import { SeeYourStatisticsCta } from "@/components/landing/SeeYourStatisticsCta";
import { StatsRow } from "@/components/StatsRow";
import { Link } from "@/i18n/navigation";
import type {
  CommunityLeaderboardPlayer,
  LandingRecentPlayer,
  LandingTopRatedGame,
  RankedCommunityGame,
} from "@/lib/community/rankings";
import type { LandingLatestReview } from "@/lib/reviews/latest-review";
import type { Game } from "@/types/game";
import { cn } from "@/lib/utils";

type HeroProps = {
  className?: string;
  featuredGames: Game[];
  mostPlayedGames?: RankedCommunityGame[];
  mostOwnedGames?: RankedCommunityGame[];
  registeredUserCount?: number;
  communityLeaderboard?: CommunityLeaderboardPlayer[];
  topRatedGames?: LandingTopRatedGame[];
  recentPlayer?: LandingRecentPlayer | null;
  latestReview?: LandingLatestReview | null;
  isAuthenticated?: boolean;
};

export function Hero({
  className,
  featuredGames,
  mostPlayedGames = [],
  mostOwnedGames = [],
  registeredUserCount = 0,
  communityLeaderboard = [],
  topRatedGames = [],
  recentPlayer = null,
  latestReview = null,
  isAuthenticated = false,
}: HeroProps) {
  const t = useTranslations("landing");

  const heroStats = [
    { value: "10,000+", label: t("statGames") },
    { value: "100,000+", label: t("statAchievements") },
  ];

  const sidebarProps = {
    mostPlayedGames,
    mostOwnedGames,
    registeredUserCount,
    recentPlayer,
    latestReview,
  };

  return (
    <section
      className={cn(
        "relative w-full min-w-0 overflow-x-hidden px-4 py-8 sm:py-10 lg:px-6",
        className,
      )}
    >
      <BackgroundGlow variant="hero" />

      <div className="relative z-10 mx-auto w-full max-w-[1600px]">
        <div className="grid grid-cols-1 items-start gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(260px,28%)] xl:gap-6">
          <div className="min-w-0 space-y-12">
            <header className="text-center xl:text-left">
              <h1 className="text-4xl font-bold tracking-[0.1em] text-white uppercase sm:text-5xl lg:text-6xl">
                {t("heroTitle")}
              </h1>

              <p className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-white/65 sm:text-lg xl:mx-0">
                {t("heroSubtitle")}
              </p>

              <p className="mx-auto mt-3 max-w-3xl text-base leading-relaxed text-white/65 sm:text-lg xl:mx-0">
                {t("steamPrivacyHint")}{" "}
                <a
                  href="https://steamcommunity.com/my/edit/settings"
                  target="_blank"
                  rel="noreferrer"
                  className="transition hover:underline hover:underline-offset-2"
                >
                  {t("steamPrivacyLearnHow")}
                </a>
              </p>

              <StatsRow stats={heroStats} className="mt-8 justify-center xl:justify-start" />
            </header>

            <div className="relative min-w-0 overflow-hidden">
              <AmbientGlow
                tone="blue"
                className="top-[4%] left-1/2 h-[min(70vw,720px)] w-[min(100%,1040px)]"
              />

              <div className="relative z-10 min-w-0">
                <div className="mb-5 flex min-w-0 items-center justify-between gap-4">
                  <h2 className="truncate text-xl font-semibold tracking-wide text-white sm:text-2xl">
                    {t("popularGames")}
                  </h2>
                  <Link
                    href="/explore"
                    className="shrink-0 text-sm font-medium text-white/65 transition hover:text-white sm:text-base"
                  >
                    {t("viewAllGames")}
                  </Link>
                </div>

                <GameGrid games={featuredGames} />
              </div>
            </div>

            <div className="relative min-w-0 overflow-hidden">
              <AmbientGlow
                tone="red-purple"
                className="top-[8%] left-1/2 h-[min(62vw,640px)] w-[min(100%,960px)]"
              />
              <div className="relative z-10 min-w-0">
                <CommunityLeaderboard
                  players={communityLeaderboard}
                  className="mt-0"
                />
                <CommunityTopGames games={topRatedGames} />
              </div>
            </div>

            <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-10 text-center backdrop-blur-md sm:px-8">
              <AmbientGlow
                tone="purple"
                className="statrealm-ambient-centered top-1/2 left-1/2 h-[min(72vw,680px)] w-[min(100%,920px)]"
              />
              <div className="relative z-10 mx-auto max-w-3xl">
                <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  {t("ctaTitle")}
                </h2>
                <p className="mt-4 text-base leading-relaxed text-white/70 sm:text-lg">
                  {t("ctaDescription")}
                </p>
                <SeeYourStatisticsCta isAuthenticated={isAuthenticated} />
              </div>
            </section>

            <p className="text-center text-sm text-white/70 sm:text-base xl:text-left">
              {t("achievementTagline")}
            </p>
          </div>

          <LandingCommunitySidebar
            {...sidebarProps}
            className="hidden min-w-0 xl:flex"
          />
        </div>

        <LandingCommunitySidebar
          {...sidebarProps}
          className="mt-8 xl:hidden"
        />
      </div>
    </section>
  );
}
