"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import type { DashboardAchievement } from "@/types/dashboard";

function getUnlockDate(timestamp: number) {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return null;

  const date = new Date(timestamp * 1000);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatUnlockTime(timestamp: number) {
  const date = getUnlockDate(timestamp);
  if (!date) return "";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function RecentAchievements({
  achievements,
  showEmptyState = false,
}: {
  achievements: DashboardAchievement[];
  showEmptyState?: boolean;
}) {
  const t = useTranslations("dashboard");
  const [isExpanded, setIsExpanded] = useState(false);
  const sortedAchievements = useMemo(
    () =>
      [...achievements].sort(
        (first, second) => second.unlockedAt - first.unlockedAt,
      ),
    [achievements],
  );
  const visibleAchievements = isExpanded
    ? sortedAchievements
    : sortedAchievements.slice(0, 10);

  return (
    <section>
      <h2 className="text-2xl font-bold text-white sm:text-3xl">
        {t("recentAchievements")}
      </h2>
      <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
        {visibleAchievements.length > 0 ? (
          <ol className="relative ml-5 border-l border-white/10">
            {visibleAchievements.map((achievement, index) => (
              <li
                key={achievement.id}
                className={
                  index === visibleAchievements.length - 1
                    ? "relative pb-0 pl-8"
                    : "relative pb-7 pl-8"
                }
              >
                <span className="absolute top-0 -left-5 flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-gradient-to-br from-[#6B2FD6] to-[#E2363C] text-white shadow-[0_0_20px_rgba(107,47,214,0.2)]">
                  <Image
                    src={achievement.iconUrl}
                    alt=""
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                </span>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-white">
                      {achievement.name}
                    </h3>
                    <p className="mt-1 text-sm text-white/50">
                      {achievement.game}
                    </p>
                  </div>
                  <time
                    dateTime={getUnlockDate(
                      achievement.unlockedAt,
                    )?.toISOString()}
                    suppressHydrationWarning
                    className="text-xs text-white/40"
                  >
                    {formatUnlockTime(achievement.unlockedAt)}
                  </time>
                </div>
              </li>
            ))}
          </ol>
        ) : showEmptyState ? (
          <p className="text-sm text-white/50">{t("noRecentAchievements")}</p>
        ) : null}

        {sortedAchievements.length > 10 && (
          <div className="mt-5 border-t border-white/10 pt-4 text-right">
            <button
              type="button"
              aria-expanded={isExpanded}
              onClick={() => setIsExpanded((expanded) => !expanded)}
              className="text-sm font-medium text-white/65 transition hover:text-white"
            >
              {isExpanded ? t("showLess") : t("viewAllAchievements")}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
