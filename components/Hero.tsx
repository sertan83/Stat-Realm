"use client";

import { useTranslations } from "next-intl";
import { AmbientGlow } from "@/components/AmbientGlow";
import { BackgroundGlow } from "@/components/BackgroundGlow";
import { CommunityLeaderboard } from "@/components/CommunityLeaderboard";
import { GameGrid } from "@/components/GameGrid";
import { GameRankPanel } from "@/components/GameRankPanel";
import { LatestReviewCard } from "@/components/LatestReviewCard";
import { PlayersTrackedCard } from "@/components/PlayersTrackedCard";
import { RecentPlayerCard } from "@/components/RecentPlayerCard";
import { ScrollIndicator } from "@/components/ScrollIndicator";
import { StatsRow } from "@/components/StatsRow";
import { Link } from "@/i18n/navigation";
import type {
  CommunityLeaderboardPlayer,
  LandingRecentPlayer,
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
  recentPlayer?: LandingRecentPlayer | null;
  latestReview?: LandingLatestReview | null;
};

export function Hero({
  className,
  featuredGames,
  mostPlayedGames = [],
  mostOwnedGames = [],
  registeredUserCount = 0,
  communityLeaderboard = [],
  recentPlayer = null,
  latestReview = null,
}: HeroProps) {
  const t = useTranslations("landing");

  const heroStats = [
    { value: "10,000+", label: t("statGames") },
    { value: "100,000+", label: t("statAchievements") },
  ];

  return (
    <section
      className={cn(
        "relative flex min-h-[calc(100vh-55px)] flex-col px-4 pt-[110px] pb-28 lg:px-6",
        className,
      )}
    >
      <BackgroundGlow variant="hero" />

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center">
        <div className="flex w-full flex-col items-center text-center">
          <h1 className="max-w-5xl text-5xl font-bold tracking-[0.12em] text-white uppercase sm:text-6xl lg:text-7xl">
            {t("heroTitle")}
          </h1>

          <p className="mt-8 max-w-3xl text-lg leading-relaxed text-white/65 sm:text-xl">
            {t("heroSubtitle")}
          </p>

          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-white/65 sm:text-xl">
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

          <StatsRow stats={heroStats} className="mt-11" />
        </div>

        <div className="relative mt-20 w-screen overflow-hidden">
          <AmbientGlow
            tone="blue"
            className="top-[4%] left-1/2 h-[min(70vw,720px)] w-[min(92vw,1040px)]"
          />

          <div className="absolute top-0 left-4 hidden w-[220px] flex-col gap-3 min-[1700px]:flex">
            <GameRankPanel
              title={t("mostPlayed")}
              games={mostPlayedGames}
              className="h-[380px]"
            />
            <PlayersTrackedCard count={registeredUserCount} />
            <RecentPlayerCard player={recentPlayer} />
          </div>

          <div className="mx-auto w-[calc(100%-2rem)] max-w-6xl">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold tracking-wide text-white sm:text-2xl">
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

            <div className="relative">
              <AmbientGlow
                tone="red-purple"
                className="top-[8%] left-1/2 h-[min(62vw,640px)] w-[min(88vw,960px)]"
              />
              <div className="relative z-10">
                <CommunityLeaderboard players={communityLeaderboard} />
              </div>
            </div>
          </div>

          <div className="absolute top-0 right-4 hidden w-[220px] flex-col gap-3 min-[1700px]:flex">
            <GameRankPanel
              title={t("mostOwned")}
              games={mostOwnedGames}
              className="h-[380px]"
            />
            <LatestReviewCard review={latestReview} />
          </div>
        </div>

        <p className="mt-20 text-center text-sm text-white/70 sm:text-base">
          {t("achievementTagline")}
        </p>
        <ScrollIndicator className="mt-12 mb-0" />
      </div>
    </section>
  );
}
