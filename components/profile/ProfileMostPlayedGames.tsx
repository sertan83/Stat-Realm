"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { DashboardGameCard } from "@/components/dashboard/DashboardGames";
import { Select } from "@/components/ui/Select";
import { formatPlaytimeMinutes } from "@/lib/i18n/formatters";
import type { ProfileMostPlayedGame } from "@/types/dashboard";

const PLAYTIME_FILTERS = ["allTime", "lastTwoWeeks"] as const;

type MostPlayedPlaytimeFilter = (typeof PLAYTIME_FILTERS)[number];

type ProfileMostPlayedGamesProps = {
  games: ProfileMostPlayedGame[];
};

function buildRankedGames(
  games: ProfileMostPlayedGame[],
  filter: MostPlayedPlaytimeFilter,
) {
  const ranked =
    filter === "allTime"
      ? games
          .filter((game) => game.playtimeAllTimeMinutes > 0)
          .sort(
            (first, second) =>
              second.playtimeAllTimeMinutes - first.playtimeAllTimeMinutes,
          )
          .map((game) => ({
            ...game,
            playtime: formatPlaytimeMinutes(game.playtimeAllTimeMinutes),
          }))
      : games
          .filter((game) => game.playtimeTwoWeeksMinutes > 0)
          .sort(
            (first, second) =>
              second.playtimeTwoWeeksMinutes - first.playtimeTwoWeeksMinutes,
          )
          .map((game) => ({
            ...game,
            playtime: formatPlaytimeMinutes(game.playtimeTwoWeeksMinutes),
          }));

  return ranked.slice(0, 10);
}

export function ProfileMostPlayedGames({ games }: ProfileMostPlayedGamesProps) {
  const t = useTranslations("dashboard");
  const [filter, setFilter] = useState<MostPlayedPlaytimeFilter>("allTime");

  const displayedGames = useMemo(
    () => buildRankedGames(games, filter),
    [filter, games],
  );

  return (
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">
          {t("mostPlayedGames")}
        </h2>

        <div className="w-full sm:w-auto sm:min-w-[180px]">
          <Select
            value={filter}
            onValueChange={(value) =>
              setFilter(value as MostPlayedPlaytimeFilter)
            }
            options={PLAYTIME_FILTERS.map((option) => ({
              value: option,
              label: t(`mostPlayedFilter.${option}`),
            }))}
            ariaLabel={t("mostPlayedFilter.label")}
            size="sm"
          />
        </div>
      </div>

      {displayedGames.length === 0 ? (
        <p className="mt-6 rounded-xl border border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-white/60 backdrop-blur-md">
          {filter === "lastTwoWeeks"
            ? t("noGamesPlayedLastTwoWeeks")
            : t("noMostPlayedGames")}
        </p>
      ) : (
        <div
          key={filter}
          className="mt-6 grid gap-4 transition-opacity duration-300 ease-out xl:grid-cols-2"
        >
          {displayedGames.map((game, index) => (
            <DashboardGameCard
              key={game.id}
              game={game}
              rank={index + 1}
              compact
            />
          ))}
        </div>
      )}
    </section>
  );
}
