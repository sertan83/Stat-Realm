import "server-only";

import type { StatRealmUser, StatRealmUserStats, UserLibraryGame } from "@/lib/db/types";
import { dashboardMetricTemplates } from "@/data/dashboard";
import {
  getCountryDisplay,
  countryCodeToFlag,
  formatLastSyncedAt,
} from "@/lib/user/country";
import {
  resolveUserAvatarUrl,
  resolveUserDisplayName,
} from "@/lib/steam/profile-sync";
import type { DashboardMetric, DashboardMetricKey } from "@/types/dashboard";
import type {
  LeaderboardPlayer,
  SteamLeaderboardGame,
  SteamLeaderboardIdentity,
  SyncedLeaderboardStats,
} from "@/types/leaderboard";

type DashboardTranslator = (
  key: string,
  values?: Record<string, string | number>,
) => string;

export function createEmptyUserStats(): StatRealmUserStats {
  return {
    totalPlaytimeMinutes: 0,
    totalGames: 0,
    totalUnlockedAchievements: null,
    totalAvailableAchievements: null,
    achievementCompletionRate: null,
    perfectGames: null,
    averageAchievementRarity: null,
    achievementTotalsStatus: "unavailable",
    achievementRarityStatus: "unavailable",
    steamLevel: null,
    countryCode: null,
  };
}

export function normalizeUserStats(
  stats?: Partial<StatRealmUserStats> | null,
): StatRealmUserStats {
  const defaults = createEmptyUserStats();

  if (!stats) {
    return defaults;
  }

  return {
    totalPlaytimeMinutes: stats.totalPlaytimeMinutes ?? defaults.totalPlaytimeMinutes,
    totalGames: stats.totalGames ?? defaults.totalGames,
    totalUnlockedAchievements: stats.totalUnlockedAchievements ?? null,
    totalAvailableAchievements: stats.totalAvailableAchievements ?? null,
    achievementCompletionRate: stats.achievementCompletionRate ?? null,
    perfectGames: stats.perfectGames ?? null,
    averageAchievementRarity: stats.averageAchievementRarity ?? null,
    achievementTotalsStatus:
      stats.achievementTotalsStatus ?? defaults.achievementTotalsStatus,
    achievementRarityStatus:
      stats.achievementRarityStatus ?? defaults.achievementRarityStatus,
    steamLevel: stats.steamLevel ?? null,
    countryCode: stats.countryCode ?? null,
  };
}

function formatTotalPlaytime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours.toLocaleString()}h ${remainingMinutes}m`;
}

function formatAveragePlaytime(totalMinutes: number, gameCount: number) {
  if (gameCount === 0) return "0h";

  return `${(totalMinutes / gameCount / 60).toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  })}h`;
}

function createUnavailableMetric(
  key: DashboardMetricKey,
  icon: string,
  t: DashboardTranslator,
): DashboardMetric {
  const unavailableDetailKeys: Partial<Record<DashboardMetricKey, string>> = {
    totalGames: "metricDetails.steamLibraryUnavailable",
    totalPlaytime: "metricDetails.steamPlaytimeUnavailable",
    totalAchievements: "metricDetails.requiresFullAchievementSync",
    achievementCompletionRate: "metricDetails.requiresFullAchievementSync",
    perfectGames: "metricDetails.requiresFullAchievementSync",
    averagePlaytimePerGame: "metricDetails.steamPlaytimeUnavailable",
    averageAchievementRarity: "metricDetails.requiresGlobalAchievementData",
    globalRank: "metricDetails.globalRankPending",
  };

  return {
    key,
    icon,
    label: t(`metrics.${key}`),
    value: t("metricDetails.unavailable"),
    detail: t(unavailableDetailKeys[key] ?? "metricDetails.unavailable"),
  };
}

export function buildDashboardMetricsFromSyncedStats(
  stats: StatRealmUserStats,
  hasLibraryData: boolean,
  t: DashboardTranslator,
): DashboardMetric[] {
  return dashboardMetricTemplates.map(({ key, icon }) => {
    if (!hasLibraryData) {
      return createUnavailableMetric(key, icon, t);
    }

    if (key === "totalGames") {
      return {
        key,
        icon,
        label: t("metrics.totalGames"),
        value: stats.totalGames.toLocaleString(),
        detail: t("metricDetails.reportedBySteam"),
      };
    }

    if (key === "totalPlaytime") {
      return {
        key,
        icon,
        label: t("metrics.totalPlaytime"),
        value: formatTotalPlaytime(stats.totalPlaytimeMinutes),
        detail: t("metricDetails.exactSumAcrossLibrary"),
      };
    }

    if (key === "averagePlaytimePerGame") {
      return {
        key,
        icon,
        label: t("metrics.averagePlaytimePerGame"),
        value: formatAveragePlaytime(
          stats.totalPlaytimeMinutes,
          stats.totalGames,
        ),
        detail: t("metricDetails.totalPlaytimeDividedByGames"),
      };
    }

    if (key === "totalAchievements") {
      return stats.achievementTotalsStatus === "complete" &&
        stats.totalUnlockedAchievements !== null
        ? {
            key,
            icon,
            label: t("metrics.totalAchievements"),
            value: stats.totalUnlockedAchievements.toLocaleString(),
            detail: t("metricDetails.achievementsAvailable", {
              count: stats.totalAvailableAchievements?.toLocaleString() ?? 0,
            }),
          }
        : {
            key,
            icon,
            label: t("metrics.totalAchievements"),
            value: t("metricDetails.unavailable"),
            detail: t("metricDetails.achievementDataPrivate"),
          };
    }

    if (key === "achievementCompletionRate") {
      return stats.achievementTotalsStatus === "complete" &&
        stats.achievementCompletionRate !== null
        ? {
            key,
            icon,
            label: t("metrics.achievementCompletionRate"),
            value: `${stats.achievementCompletionRate.toFixed(1)}%`,
            detail: t("metricDetails.achievementsUnlocked", {
              unlocked:
                stats.totalUnlockedAchievements?.toLocaleString() ?? 0,
              total: stats.totalAvailableAchievements?.toLocaleString() ?? 0,
            }),
          }
        : {
            key,
            icon,
            label: t("metrics.achievementCompletionRate"),
            value: t("metricDetails.unavailable"),
            detail: t("metricDetails.achievementDataPrivate"),
          };
    }

    if (key === "perfectGames") {
      return stats.achievementTotalsStatus === "complete" &&
        stats.perfectGames !== null
        ? {
            key,
            icon,
            label: t("metrics.perfectGames"),
            value: stats.perfectGames.toLocaleString(),
            detail: t("metricDetails.allAchievementsUnlocked"),
          }
        : {
            key,
            icon,
            label: t("metrics.perfectGames"),
            value: t("metricDetails.unavailable"),
            detail: t("metricDetails.achievementDataPrivate"),
          };
    }

    if (key === "averageAchievementRarity") {
      return stats.achievementRarityStatus === "complete" &&
        stats.averageAchievementRarity !== null
        ? {
            key,
            icon,
            label: t("metrics.averageAchievementRarity"),
            value: `${stats.averageAchievementRarity.toFixed(1)}%`,
            detail: t("metricDetails.acrossUnlockedAchievements"),
          }
        : {
            key,
            icon,
            label: t("metrics.averageAchievementRarity"),
            value: t("metricDetails.unavailable"),
            detail: t("metricDetails.achievementDataPrivate"),
          };
    }

    return createUnavailableMetric(key, icon, t);
  });
}

export function buildLeaderboardIdentityFromUser(
  user: StatRealmUser,
): SteamLeaderboardIdentity {
  const stats = normalizeUserStats(user.stats);

  return {
    steamId: user.steamId,
    username: resolveUserDisplayName(user),
    avatarUrl: resolveUserAvatarUrl(user) || undefined,
    country: getCountryDisplay(stats.countryCode),
    countryFlag: countryCodeToFlag(stats.countryCode),
    steamLevel: stats.steamLevel,
  };
}

export function buildSyncedLeaderboardStats(
  user: StatRealmUser,
): SyncedLeaderboardStats {
  const stats = normalizeUserStats(user.stats);

  return {
    globalHoursPlayed:
      stats.totalPlaytimeMinutes > 0
        ? Math.round((stats.totalPlaytimeMinutes / 60) * 10) / 10
        : 0,
    globalTotalGames: stats.totalGames,
    globalAchievements: stats.totalUnlockedAchievements,
    globalCompletion: stats.achievementCompletionRate,
    globalPerfectGame:
      stats.perfectGames !== null ? stats.perfectGames > 0 : null,
    steamLevel: stats.steamLevel,
    lastUpdated: formatLastSyncedAt(user.lastSyncedAt),
  };
}

export function buildSteamLeaderboardGamesFromLibrary(
  library: UserLibraryGame[],
  options: {
    catalogAliasesByAppId?: Map<number, string[]>;
    catalogCategoriesByAppId?: Map<number, string>;
    steamGameCategoryLabel?: string;
  } = {},
): SteamLeaderboardGame[] {
  const categoryLabel = options.steamGameCategoryLabel ?? "Steam Game";

  return library.map((game) => ({
    appId: game.appId,
    title: game.name,
    aliases: options.catalogAliasesByAppId?.get(game.appId) ?? [],
    category:
      options.catalogCategoriesByAppId?.get(game.appId) ?? categoryLabel,
    playtimeMinutes: game.playtimeMinutes,
    playtimeTwoWeeksMinutes: game.playtimeTwoWeeksMinutes,
    achievements: game.achievementsUnlocked,
    achievementsTotal: game.achievementsTotal,
    completion: game.completionPercentage,
    perfectGame: game.perfectGame,
  }));
}
