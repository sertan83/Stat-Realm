"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { LeaderboardPlayer } from "@/types/leaderboard";

type LeaderboardTableProps = {
  players: LeaderboardPlayer[];
  rankOffset: number;
};

export function LeaderboardTable({
  players,
  rankOffset,
}: LeaderboardTableProps) {
  const t = useTranslations("leaderboards");
  const tCommon = useTranslations("common");

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5 backdrop-blur-md">
      <table className="w-full min-w-[1180px] border-collapse">
        <thead>
          <tr className="border-b border-white/10 text-left text-xs tracking-wide text-white/45 uppercase">
            <th className="px-4 py-4 font-medium">{t("rank")}</th>
            <th className="px-4 py-4 font-medium">{t("player")}</th>
            <th className="px-4 py-4 font-medium">{t("avatar")}</th>
            <th className="px-4 py-4 font-medium">{t("country")}</th>
            <th className="px-4 py-4 font-medium">{t("hoursPlayed")}</th>
            <th className="px-4 py-4 font-medium">{t("achievements")}</th>
            <th className="px-4 py-4 font-medium">{t("completionPercent")}</th>
            <th className="px-4 py-4 font-medium">{t("perfectGame")}</th>
            <th className="px-4 py-4 font-medium">{t("steamLevel")}</th>
            <th className="px-4 py-4 font-medium">{t("lastUpdated")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {players.map((player, index) => (
            <tr
              key={player.steamId}
              className="transition duration-[250ms] hover:bg-white/5"
            >
              <td className="px-4 py-3.5 font-semibold text-white/45">
                #{rankOffset + index + 1}
              </td>
              <td className="px-4 py-3.5">
                <Link
                  href={`/user/${player.steamId}`}
                  className="font-medium text-white transition hover:text-[#EFA5A8]"
                >
                  {player.username}
                </Link>
              </td>
              <td className="px-4 py-3.5">
                <Link
                  href={`/user/${player.steamId}`}
                  aria-label={t("viewProfile", { name: player.username })}
                  className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#6B2FD6] to-[#E2363C] text-xs font-bold text-white transition hover:scale-105"
                >
                  {player.avatarUrl ? (
                    <Image
                      src={player.avatarUrl}
                      alt=""
                      fill
                      sizes="36px"
                      className="object-cover"
                    />
                  ) : (
                    player.initials
                  )}
                </Link>
              </td>
              <td className="px-4 py-3.5 text-sm text-white/70">
                <span className="mr-2 text-base">{player.countryFlag}</span>
                {player.country}
              </td>
              <td className="px-4 py-3.5 text-sm font-medium text-white">
                {player.hoursPlayed === null
                  ? tCommon("emDash")
                  : `${player.hoursPlayed.toLocaleString()}h`}
              </td>
              <td className="px-4 py-3.5 text-sm text-white/70">
                {player.achievements?.toLocaleString() ?? tCommon("emDash")}
              </td>
              <td className="px-4 py-3.5 text-sm font-medium text-white">
                {player.completion === null
                  ? tCommon("emDash")
                  : `${player.completion.toFixed(1)}%`}
              </td>
              <td className="px-4 py-3.5 text-sm">
                <span
                  className={
                    player.perfectGame
                      ? "rounded-full bg-[#E2363C]/15 px-2.5 py-1 text-[#EFA5A8]"
                      : "text-white/35"
                  }
                >
                  {player.perfectGame ? tCommon("perfect") : tCommon("emDash")}
                </span>
              </td>
              <td className="px-4 py-3.5">
                <span className="inline-flex min-w-10 justify-center rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs font-semibold text-white">
                  {player.steamLevel ?? tCommon("emDash")}
                </span>
              </td>
              <td className="px-4 py-3.5 text-sm text-white/45">
                {player.lastUpdated}
              </td>
            </tr>
          ))}
          {players.length === 0 && (
            <tr>
              <td
                colSpan={10}
                className="px-4 py-10 text-center text-sm text-white/45"
              >
                {t("emptyFiltered")}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
