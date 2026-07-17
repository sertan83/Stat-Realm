"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { LeaderboardFeaturedPlayer } from "@/components/leaderboards/LeaderboardFeaturedPlayer";
import { LeaderboardTable } from "@/components/leaderboards/LeaderboardTable";
import type {
  DbLeaderboardEntry,
  LeaderboardGlobalRank,
  LeaderboardPlayer,
  LeaderboardSort,
} from "@/types/leaderboard";
import { sortLeaderboardPlayers } from "@/lib/leaderboard/filtered-stats";
import { LeaderboardSignInBanner } from "@/components/leaderboards/LeaderboardSignInBanner";

const PLAYERS_PER_PAGE = 20;
const MAX_LEADERBOARD_PLAYERS = 100;

const GLOBAL_RANK_TO_SORT: Record<LeaderboardGlobalRank, LeaderboardSort> = {
  "Total Playtime": "Total Playtime",
  "Games Owned": "Total Games",
  "Total Achievements": "Achievements Unlocked",
};

type LeaderboardsDashboardProps = {
  dbEntries: DbLeaderboardEntry[];
  showSignInBanner?: boolean;
};

export function LeaderboardsDashboard({
  dbEntries,
  showSignInBanner = false,
}: LeaderboardsDashboardProps) {
  const t = useTranslations("leaderboards");
  const tCommon = useTranslations("common");
  const [rankBy, setRankBy] =
    useState<LeaderboardGlobalRank>("Total Playtime");
  const [activePage, setActivePage] = useState(1);

  const rankedPlayers = useMemo(() => {
    const players = dbEntries.map((entry) => {
      const player: LeaderboardPlayer = {
        ...entry.identity,
        initials:
          entry.identity.username
            .split(/\s+/)
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase() || "SR",
        hoursPlayed: entry.syncedStats.globalHoursPlayed,
        totalGames: entry.syncedStats.globalTotalGames,
        achievements: entry.syncedStats.globalAchievements,
        completion: entry.syncedStats.globalCompletion,
        perfectGame: entry.syncedStats.globalPerfectGame,
        steamLevel: entry.syncedStats.steamLevel ?? entry.identity.steamLevel,
        lastUpdated: entry.syncedStats.lastUpdated,
      };

      return player;
    });

    return sortLeaderboardPlayers(
      players,
      GLOBAL_RANK_TO_SORT[rankBy],
    ).slice(0, MAX_LEADERBOARD_PLAYERS);
  }, [dbEntries, rankBy]);

  const featuredPlayer = rankedPlayers[0] ?? null;
  const totalPages = Math.max(
    1,
    Math.ceil(rankedPlayers.length / PLAYERS_PER_PAGE),
  );
  const rankOffset = (activePage - 1) * PLAYERS_PER_PAGE;
  const visiblePlayers = rankedPlayers.slice(
    rankOffset,
    rankOffset + PLAYERS_PER_PAGE,
  );
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <>
      {showSignInBanner ? <LeaderboardSignInBanner /> : null}

      <LeaderboardFeaturedPlayer
        player={featuredPlayer}
        rankBy={rankBy}
        onRankByChange={(value) => {
          setRankBy(value);
          setActivePage(1);
        }}
      />

      <section className="mt-8">
        <div className="mb-5">
          <p className="text-xs font-semibold tracking-[0.18em] text-[#EFA5A8] uppercase">
            {t("top100Players")}
          </p>
          <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
            {t("globalLeaderboard")}
          </h2>
        </div>

        <LeaderboardTable players={visiblePlayers} rankOffset={rankOffset} />

        <nav
          aria-label={t("paginationAriaLabel")}
          className="mt-8 flex flex-wrap items-center justify-center gap-2"
        >
          <button
            type="button"
            disabled={activePage === 1}
            onClick={() => setActivePage((page) => page - 1)}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:border-white/20 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:bg-transparent disabled:text-white/35"
          >
            {tCommon("previous")}
          </button>

          {pages.map((page) => (
            <button
              key={page}
              type="button"
              onClick={() => setActivePage(page)}
              aria-current={page === activePage ? "page" : undefined}
              className={
                page === activePage
                  ? "flex h-10 w-10 items-center justify-center rounded-lg bg-[#E2363C] text-sm font-semibold text-white shadow-[0_0_24px_rgba(226,54,60,0.3)]"
                  : "flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-sm text-white/70 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
              }
            >
              {page}
            </button>
          ))}

          <button
            type="button"
            disabled={activePage === totalPages}
            onClick={() => setActivePage((page) => page + 1)}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:border-white/20 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:bg-transparent disabled:text-white/35"
          >
            {tCommon("next")}
          </button>
        </nav>
      </section>
    </>
  );
}
