import { formatPlaytime } from "@/lib/steam/api";
import type { DetailMetric } from "@/types/game-details";

function formatCommunityPlaytime(minutes: number | null) {
  if (minutes === null) {
    return "Unavailable";
  }

  const hours = minutes / 60;
  return hours >= 100
    ? `${Math.round(hours).toLocaleString()} hours`
    : `${hours.toFixed(1)} hours`;
}

function formatAchievementTotal(total: number) {
  return total > 0 ? String(total) : "Unavailable";
}

export function buildStatRealmGameStatisticsFromDb({
  ownerCount,
  averagePlaytimeMinutes,
  averageCompletion,
  perfectGamesCount,
  achievementTotal,
  steamReviewPercentage,
}: {
  ownerCount: number;
  averagePlaytimeMinutes: number | null;
  averageCompletion: number | null;
  perfectGamesCount: number;
  achievementTotal: number;
  steamReviewPercentage: string | null;
}): DetailMetric[] {
  const metrics: DetailMetric[] = [
    { label: "Players Tracked", value: ownerCount.toLocaleString() },
    {
      label: "Average Playtime",
      value:
        averagePlaytimeMinutes === null
          ? "0h"
          : formatPlaytime(averagePlaytimeMinutes),
    },
    {
      label: "Total Achievements",
      value: formatAchievementTotal(achievementTotal),
    },
    {
      label: "Average Completion",
      value:
        averageCompletion === null
          ? "0%"
          : `${averageCompletion.toFixed(1)}%`,
    },
    {
      label: "Perfect Games",
      value: perfectGamesCount.toLocaleString(),
    },
  ];

  if (steamReviewPercentage) {
    metrics.push({
      label: "Steam Reviews",
      value: steamReviewPercentage,
    });
  }

  return metrics;
}

export function buildStatRealmCommunityStatisticsFromDb({
  ownerCount,
  averagePlaytimeMinutes,
  averageCompletion,
}: {
  ownerCount: number;
  averagePlaytimeMinutes: number | null;
  averageCompletion: number | null;
}): DetailMetric[] {
  if (ownerCount === 0) {
    return [
      { label: "Average Playtime", value: "0h" },
      { label: "Most Popular Difficulty", value: "Unavailable" },
      { label: "Average Completion Rate", value: "0%" },
      { label: "Most Common Playstyle", value: "Unavailable" },
    ];
  }

  return [
    {
      label: "Average Playtime",
      value: formatCommunityPlaytime(averagePlaytimeMinutes),
    },
    { label: "Most Popular Difficulty", value: "Unavailable" },
    {
      label: "Average Completion Rate",
      value:
        averageCompletion === null
          ? "Unavailable"
          : `${averageCompletion.toFixed(1)}%`,
    },
    { label: "Most Common Playstyle", value: "Unavailable" },
  ];
}
