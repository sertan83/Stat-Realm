import "server-only";

import type { StatRealmUser, StatRealmUserStats, UserLibraryGame } from "@/lib/db/types";
import { dashboardMetrics } from "@/data/dashboard";
import {
  getCountryDisplay,
  countryCodeToFlag,
  formatLastSyncedAt,
} from "@/lib/user/country";
import {
  resolveUserAvatarUrl,
  resolveUserDisplayName,
} from "@/lib/steam/profile-sync";
import type { DashboardMetric } from "@/types/dashboard";
import type {
  LeaderboardPlayer,
  SteamLeaderboardGame,
  SteamLeaderboardIdentity,
  SyncedLeaderboardStats,
} from "@/types/leaderboard";

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

export function buildDashboardMetricsFromSyncedStats(
  stats: StatRealmUserStats,
  hasLibraryData: boolean,
): DashboardMetric[] {
  return dashboardMetrics.map((metric) => {
    if (!hasLibraryData) {
      return metric;
    }

    if (metric.label === "Total Games") {
      return {
        ...metric,
        value: stats.totalGames.toLocaleString(),
        detail: "Reported by Steam",
      };
    }

    if (metric.label === "Total Playtime") {
      return {
        ...metric,
        value: formatTotalPlaytime(stats.totalPlaytimeMinutes),
        detail: "Exact sum across Steam library",
      };
    }

    if (metric.label === "Average Playtime per Game") {
      return {
        ...metric,
        value: formatAveragePlaytime(
          stats.totalPlaytimeMinutes,
          stats.totalGames,
        ),
        detail: "Total playtime ÷ total games",
      };
    }

    if (metric.label === "Total Achievements") {
      return stats.achievementTotalsStatus === "complete" &&
        stats.totalUnlockedAchievements !== null
        ? {
            ...metric,
            value: stats.totalUnlockedAchievements.toLocaleString(),
            detail: `${stats.totalAvailableAchievements?.toLocaleString() ?? 0} available`,
          }
        : {
            ...metric,
            detail: "Some Steam achievement data is private or unavailable",
          };
    }

    if (metric.label === "Achievement Completion Rate") {
      return stats.achievementTotalsStatus === "complete" &&
        stats.achievementCompletionRate !== null
        ? {
            ...metric,
            value: `${stats.achievementCompletionRate.toFixed(1)}%`,
            detail: `${stats.totalUnlockedAchievements?.toLocaleString() ?? 0} of ${stats.totalAvailableAchievements?.toLocaleString() ?? 0} unlocked`,
          }
        : {
            ...metric,
            detail: "Some Steam achievement data is private or unavailable",
          };
    }

    if (metric.label === "Perfect Games") {
      return stats.achievementTotalsStatus === "complete" &&
        stats.perfectGames !== null
        ? {
            ...metric,
            value: stats.perfectGames.toLocaleString(),
            detail: "All available achievements unlocked",
          }
        : {
            ...metric,
            detail: "Some Steam achievement data is private or unavailable",
          };
    }

    if (metric.label === "Average Achievement Rarity") {
      return stats.achievementRarityStatus === "complete" &&
        stats.averageAchievementRarity !== null
        ? {
            ...metric,
            value: `${stats.averageAchievementRarity.toFixed(1)}%`,
            detail: "Across unlocked achievements",
          }
        : {
            ...metric,
            detail: "Some Steam achievement data is private or unavailable",
          };
    }

    return metric;
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
  } = {},
): SteamLeaderboardGame[] {
  return library.map((game) => ({
    appId: game.appId,
    title: game.name,
    aliases: options.catalogAliasesByAppId?.get(game.appId) ?? [],
    category:
      options.catalogCategoriesByAppId?.get(game.appId) ?? "Steam Game",
    playtimeMinutes: game.playtimeMinutes,
    playtimeTwoWeeksMinutes: game.playtimeTwoWeeksMinutes,
    achievements: game.achievementsUnlocked,
    achievementsTotal: game.achievementsTotal,
    completion: game.completionPercentage,
    perfectGame: game.perfectGame,
  }));
}

