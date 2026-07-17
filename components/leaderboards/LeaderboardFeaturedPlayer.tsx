"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type {
  LeaderboardGlobalRank,
  LeaderboardPlayer,
} from "@/types/leaderboard";

import { Select } from "@/components/ui/Select";

const globalRankOptions: LeaderboardGlobalRank[] = [
  "Total Playtime",
  "Games Owned",
  "Total Achievements",
];

const rankByTranslationKeys: Record<LeaderboardGlobalRank, string> = {
  "Total Playtime": "totalPlaytime",
  "Games Owned": "gamesOwned",
  "Total Achievements": "totalAchievements",
};

type LeaderboardFeaturedPlayerProps = {
  player: LeaderboardPlayer | null;
  rankBy: LeaderboardGlobalRank;
  onRankByChange: (value: LeaderboardGlobalRank) => void;
};

function formatFeaturedStat(
  player: LeaderboardPlayer,
  rankBy: LeaderboardGlobalRank,
  t: ReturnType<typeof useTranslations>,
  tCommon: ReturnType<typeof useTranslations>,
) {
  switch (rankBy) {
    case "Games Owned":
      return {
        value:
          player.totalGames === null
            ? tCommon("emDash")
            : player.totalGames.toLocaleString(),
        label: t("gamesOwnedStat"),
      };
    case "Total Achievements":
      return {
        value:
          player.achievements === null
            ? tCommon("emDash")
            : player.achievements.toLocaleString(),
        label: t("achievementsUnlockedStat"),
      };
    default:
      return {
        value:
          player.hoursPlayed === null
            ? tCommon("emDash")
            : `${player.hoursPlayed.toLocaleString()}h`,
        label: t("totalPlaytimeStat"),
      };
  }
}

export function LeaderboardFeaturedPlayer({
  player,
  rankBy,
  onRankByChange,
}: LeaderboardFeaturedPlayerProps) {
  const t = useTranslations("leaderboards");
  const tRanks = useTranslations("leaderboardRanks");
  const tCommon = useTranslations("common");

  if (!player) {
    return null;
  }

  const featuredStat = formatFeaturedStat(player, rankBy, t, tCommon);

  return (
    <section aria-label={t("featuredTopPlayer")}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-[#EFA5A8] uppercase">
            {t("featuredPlayer")}
          </p>
          <h2 className="mt-1.5 text-2xl font-bold text-white sm:text-3xl">
            {t("globalNumberOne")}
          </h2>
        </div>

        <div className="w-full sm:max-w-xs">
          <span className="mb-2 block text-xs font-medium tracking-wide text-white/45 uppercase">
            {t("rankBy")}
          </span>
          <Select
            value={rankBy}
            onValueChange={(value) =>
              onRankByChange(value as LeaderboardGlobalRank)
            }
            options={globalRankOptions.map((item) => ({
              value: item,
              label: tRanks(rankByTranslationKeys[item]),
            }))}
          />
        </div>
      </div>

      <Link
        href={`/user/${player.steamId}`}
        className="group block rounded-xl border border-[#E2363C]/40 bg-white/5 p-8 text-center shadow-[0_0_45px_rgba(226,54,60,0.18)] backdrop-blur-md transition duration-[250ms] hover:scale-[1.01] hover:border-[#E2363C]/55 sm:p-10"
      >
        <div className="text-4xl" aria-hidden="true">
          🥇
        </div>
        <p className="mt-2 text-xs font-semibold tracking-wider text-white/45 uppercase">
          {t("rankOneBy", { rankBy: tRanks(rankByTranslationKeys[rankBy]) })}
        </p>
        <div className="relative mx-auto mt-6 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#6B2FD6] to-[#E2363C] text-2xl font-bold text-white ring-2 ring-white/15">
          {player.avatarUrl ? (
            <Image
              src={player.avatarUrl}
              alt=""
              fill
              sizes="96px"
              className="object-cover"
            />
          ) : (
            player.initials
          )}
        </div>
        <h3 className="mt-5 truncate text-2xl font-semibold text-white transition group-hover:text-white/80">
          {player.username}
        </h3>
        <p className="mt-4 text-lg text-white/65">
          <strong className="text-white">{featuredStat.value}</strong>{" "}
          {featuredStat.label}
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-white/45">
          <span>
            {player.countryFlag} {player.country}
          </span>
          {player.steamLevel !== null ? (
            <span>
              {t("steamLevel")} {player.steamLevel}
            </span>
          ) : null}
        </div>
      </Link>
    </section>
  );
}
