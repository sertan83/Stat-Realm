"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { LandingRecentPlayer } from "@/lib/community/rankings";
import { cn } from "@/lib/utils";

type RecentPlayerCardProps = {
  player: LandingRecentPlayer | null;
  className?: string;
};

function UserClockIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0 text-white/55"
    >
      <path
        d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M4.5 20.5a7.5 7.5 0 0 1 15 0"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M12 12v3.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M12 7.5V12"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function formatJoinedAgo(
  timestamp: string,
  t: ReturnType<typeof useTranslations>,
) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return t("joinedJustNow");
  }

  const diffMinutes = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / (60 * 1000)),
  );

  if (diffMinutes < 1) {
    return t("joinedJustNow");
  }

  if (diffMinutes < 60) {
    return t("joinedMinutesAgo", { count: diffMinutes });
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return t("joinedHoursAgo", { count: diffHours });
  }

  const diffDays = Math.floor(diffHours / 24);
  return t("joinedDaysAgo", { count: diffDays });
}

function formatTotalPlaytimeHours(totalPlaytimeMinutes: number) {
  const hours = totalPlaytimeMinutes / 60;

  return hours >= 100
    ? Math.round(hours).toLocaleString()
    : hours.toFixed(1);
}

export function RecentPlayerCard({ player, className }: RecentPlayerCardProps) {
  const t = useTranslations("landing");
  const tDashboard = useTranslations("dashboard");

  const cardClassName = cn(
    "rounded-xl border border-white/10 bg-white/5 p-4 shadow-[0_0_40px_rgba(107,47,214,0.12)] backdrop-blur-md transition duration-[250ms] hover:scale-[1.02] hover:border-white/15",
    className,
  );

  return (
    <aside className={cardClassName}>
      <div className="flex items-center gap-2">
        <UserClockIcon />
        <h3 className="text-sm font-semibold tracking-wide text-white sm:text-base">
          {t("recentPlayer")}
        </h3>
      </div>

      {!player ? (
        <p className="mt-3 text-xs leading-relaxed text-white/55 sm:text-sm">
          {t("noRecentPlayers")}
        </p>
      ) : (
        <Link
          href={`/user/${player.steamId}`}
          aria-label={t("viewRecentPlayerProfile", { name: player.username })}
          className="group mt-3 block rounded-lg transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40"
        >
          <div className="flex items-start gap-3">
            <div className="relative shrink-0">
              <div className="relative h-11 w-11 overflow-hidden rounded-full border border-white/15 bg-[#140B2D]">
                {player.avatarUrl ? (
                  <Image
                    src={player.avatarUrl}
                    alt=""
                    fill
                    sizes="44px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-white/60">
                    {player.username.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              {player.isOnline ? (
                <span
                  aria-hidden="true"
                  className="absolute right-0 bottom-0 h-3 w-3 rounded-full border-2 border-[#140B2D] bg-[#79D38C]"
                />
              ) : null}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white transition group-hover:text-white/85">
                {player.username}
              </p>
              <p className="mt-1 text-xs text-white/55">
                {formatJoinedAgo(player.lastSyncedAt, t)}
              </p>
            </div>
          </div>

          <div className="mt-3 space-y-1 border-t border-white/10 pt-3 text-xs text-white/65">
            {player.steamLevel !== null ? (
              <p>
                {tDashboard("steamLevel", { level: player.steamLevel })}
              </p>
            ) : null}
            <p>
              <span className="text-white/45">{t("totalPlaytime")}</span>{" "}
              <span className="font-medium text-white">
                {t("totalPlaytimeValue", {
                  hours: formatTotalPlaytimeHours(player.totalPlaytimeMinutes),
                })}
              </span>
            </p>
          </div>
        </Link>
      )}
    </aside>
  );
}
