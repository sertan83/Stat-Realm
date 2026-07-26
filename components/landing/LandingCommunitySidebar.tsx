"use client";

import { useTranslations } from "next-intl";
import { GameRankPanel } from "@/components/GameRankPanel";
import { LatestReviewCard } from "@/components/LatestReviewCard";
import { PlayersTrackedCard } from "@/components/PlayersTrackedCard";
import { RecentPlayerCard } from "@/components/RecentPlayerCard";
import type {
  LandingRecentPlayer,
  RankedCommunityGame,
} from "@/lib/community/rankings";
import type { LandingLatestReview } from "@/lib/reviews/latest-review";
import { cn } from "@/lib/utils";

type LandingCommunitySidebarProps = {
  mostPlayedGames: RankedCommunityGame[];
  mostOwnedGames: RankedCommunityGame[];
  registeredUserCount: number;
  recentPlayer: LandingRecentPlayer | null;
  latestReview: LandingLatestReview | null;
  className?: string;
};

export function LandingCommunitySidebar({
  mostPlayedGames,
  mostOwnedGames,
  registeredUserCount,
  recentPlayer,
  latestReview,
  className,
}: LandingCommunitySidebarProps) {
  const t = useTranslations("landing");

  return (
    <aside
      aria-label={t("communitySidebar")}
      className={cn(
        "flex w-full max-w-[280px] flex-col gap-3 xl:w-[270px] xl:max-w-[270px]",
        className,
      )}
    >
      <GameRankPanel title={t("mostPlayed")} games={mostPlayedGames} />
      <GameRankPanel title={t("mostOwned")} games={mostOwnedGames} />
      <LatestReviewCard review={latestReview} />
      <RecentPlayerCard player={recentPlayer} />
      <PlayersTrackedCard count={registeredUserCount} />
    </aside>
  );
}
