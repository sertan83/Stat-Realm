import type { DetailMetric } from "@/types/game-details";
import {
  formatPlaytimeMinutes,
  formatPlaytimeHoursLong,
} from "@/lib/i18n/formatters";

type GameDetailsTranslator = (
  key: string,
  values?: Record<string, string | number>,
) => string;

function formatAchievementTotal(total: number, unavailable: string) {
  return total > 0 ? String(total) : unavailable;
}

export function buildStatRealmGameStatisticsFromDb({
  ownerCount,
  averagePlaytimeMinutes,
  averageCompletion,
  perfectGamesCount,
  achievementTotal,
  steamReviewPercentage,
  tMetrics,
  tCommon,
}: {
  ownerCount: number;
  averagePlaytimeMinutes: number | null;
  averageCompletion: number | null;
  perfectGamesCount: number;
  achievementTotal: number;
  steamReviewPercentage: string | null;
  tMetrics: GameDetailsTranslator;
  tCommon: GameDetailsTranslator;
}): DetailMetric[] {
  const metrics: DetailMetric[] = [
    {
      label: tMetrics("playersTracked"),
      value: ownerCount.toLocaleString(),
    },
    {
      label: tMetrics("averagePlaytime"),
      value:
        averagePlaytimeMinutes === null
          ? tCommon("hoursShort", { hours: 0 })
          : formatPlaytimeMinutes(averagePlaytimeMinutes),
    },
    {
      label: tMetrics("totalAchievements"),
      value: formatAchievementTotal(achievementTotal, tCommon("unavailable")),
    },
    {
      label: tMetrics("averageCompletion"),
      value:
        averageCompletion === null
          ? tCommon("percentValue", { percentage: 0 })
          : tCommon("percentValue", {
              percentage: averageCompletion.toFixed(1),
            }),
    },
    {
      label: tMetrics("perfectGames"),
      value: perfectGamesCount.toLocaleString(),
    },
  ];

  if (steamReviewPercentage) {
    metrics.push({
      label: tMetrics("steamReviews"),
      value: steamReviewPercentage,
    });
  }

  return metrics;
}

export function buildStatRealmCommunityStatisticsFromDb({
  ownerCount,
  averagePlaytimeMinutes,
  averageCompletion,
  tMetrics,
  tCommon,
}: {
  ownerCount: number;
  averagePlaytimeMinutes: number | null;
  averageCompletion: number | null;
  tMetrics: GameDetailsTranslator;
  tCommon: GameDetailsTranslator;
}): DetailMetric[] {
  if (ownerCount === 0) {
    return [
      {
        label: tMetrics("averagePlaytime"),
        value: tCommon("hoursShort", { hours: 0 }),
      },
      {
        label: tMetrics("mostPopularDifficulty"),
        value: tCommon("unavailable"),
      },
      {
        label: tMetrics("averageCompletionRate"),
        value: tCommon("percentValue", { percentage: 0 }),
      },
      {
        label: tMetrics("mostCommonPlaystyle"),
        value: tCommon("unavailable"),
      },
    ];
  }

  return [
    {
      label: tMetrics("averagePlaytime"),
      value:
        averagePlaytimeMinutes === null
          ? tCommon("unavailable")
          : formatPlaytimeHoursLong(averagePlaytimeMinutes),
    },
    {
      label: tMetrics("mostPopularDifficulty"),
      value: tCommon("unavailable"),
    },
    {
      label: tMetrics("averageCompletionRate"),
      value:
        averageCompletion === null
          ? tCommon("unavailable")
          : tCommon("percentValue", {
              percentage: averageCompletion.toFixed(1),
            }),
    },
    {
      label: tMetrics("mostCommonPlaystyle"),
      value: tCommon("unavailable"),
    },
  ];
}
