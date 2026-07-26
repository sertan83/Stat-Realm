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
      className={cn("flex w-full min-w-0 flex-col gap-3", className)}
    >
      <GameRankPanel title={t("mostPlayed")} games={mostPlayedGames} />
      <GameRankPanel title={t("mostOwned")} games={mostOwnedGames} />
      <LatestReviewCard review={latestReview} />
      <RecentPlayerCard player={recentPlayer} />
      <PlayersTrackedCard count={registeredUserCount} />
    </aside>
  );
}
