"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { Achievement } from "@/types/game-details";

type AchievementListProps = {
  achievements: Achievement[];
  gameSlug: string;
  status: "complete" | "empty" | "unavailable";
  dataSource?: "personal" | "global";
};

function getGlobalUnlockPercentage(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "number" && typeof value !== "string") {
    return null;
  }

  const percentage = Number(value);
  return Number.isFinite(percentage) ? percentage : null;
}

export function AchievementList({
  achievements,
  gameSlug,
  status,
  dataSource = "global",
}: AchievementListProps) {
  const t = useTranslations("gameDetails");
  const tCommon = useTranslations("common");
  const [expandedGameSlug, setExpandedGameSlug] = useState<string | null>(null);
  const isExpanded = expandedGameSlug === gameSlug;
  const sortedAchievements = useMemo(
    () =>
      [...achievements].sort((first, second) => {
        const firstPercentage =
          getGlobalUnlockPercentage(first.globalUnlockPercentage) ??
          Number.POSITIVE_INFINITY;
        const secondPercentage =
          getGlobalUnlockPercentage(second.globalUnlockPercentage) ??
          Number.POSITIVE_INFINITY;
        return firstPercentage - secondPercentage;
      }),
    [achievements],
  );
  const visibleAchievements = isExpanded
    ? sortedAchievements
    : sortedAchievements.slice(0, 10);

  if (status === "unavailable") {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/55 backdrop-blur-md">
        {t("achievementsUnavailable")}
      </div>
    );
  }

  if (status === "empty" || achievements.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/55 backdrop-blur-md">
        {t("noAchievements")}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-md">
      {dataSource === "global" ? (
        <p className="border-b border-white/10 px-4 py-3 text-xs text-white/50 sm:px-5">
          {t("globalAchievementStats")}
        </p>
      ) : null}

      <ul className="divide-y divide-white/10">
        {visibleAchievements.map((achievement) => (
          <li
            key={achievement.apiName}
            className="flex items-center gap-4 p-4 transition hover:bg-white/5 sm:p-5"
          >
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-gradient-to-br from-[#6B2FD6]/50 to-[#E2363C]/30 shadow-[0_0_20px_rgba(107,47,214,0.2)]">
              <Image
                src={achievement.iconUrl}
                alt=""
                fill
                sizes="48px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-white">
                {achievement.name}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-white/40">
                {achievement.description || tCommon("notApplicable")}
              </p>
            </div>
            <div className="shrink-0 text-right">
              {dataSource === "personal" ? (
                <>
                  <p
                    className={`font-semibold ${
                      achievement.isUnlocked
                        ? "text-[#79D38C]"
                        : "text-white/45"
                    }`}
                  >
                    {achievement.isUnlocked ? t("unlocked") : t("locked")}
                  </p>
                  {achievement.isUnlocked ? (
                    <p className="mt-1 text-xs text-white/40">
                      {achievement.unlockedAt ?? tCommon("notApplicable")}
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="font-semibold text-white/45">{t("globalStat")}</p>
              )}
              <p className="mt-1 text-xs text-[#EFA5A8]">
                {(() => {
                  const percentage = getGlobalUnlockPercentage(
                    achievement.globalUnlockPercentage,
                  );
                  return percentage === null
                    ? tCommon("notApplicable")
                    : t("globalUnlockPercentage", {
                        percentage: percentage.toFixed(1),
                      });
                })()}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {sortedAchievements.length > 10 && (
        <div className="border-t border-white/10 p-4 text-right">
          <button
            type="button"
            aria-expanded={isExpanded}
            onClick={() =>
              setExpandedGameSlug(isExpanded ? null : gameSlug)
            }
            className="text-sm font-medium text-white/65 transition hover:text-white"
          >
            {isExpanded ? t("showLess") : t("viewAllAchievements")}
          </button>
        </div>
      )}
    </div>
  );
}
