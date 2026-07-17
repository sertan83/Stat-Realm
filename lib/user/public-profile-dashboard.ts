import "server-only";

import { getTranslations } from "next-intl/server";
import {
  getStatRealmUser,
  getUserAchievementHistory,
  getUserLibrary,
  getUserProfileAnalytics,
} from "@/lib/db";
import { createIntlFormatters } from "@/lib/i18n/formatters";
import { toDashboardAchievements } from "@/lib/steam/achievement-history";
import {
  resolveUserAvatarUrl,
  resolveUserDisplayName,
} from "@/lib/steam/profile-sync";
import {
  buildMostPlayedFromLibrary,
  buildRecentlyPlayedFromLibrary,
  normalizeStoredGenrePlaytime,
} from "@/lib/user/profile-snapshot";
import {
  buildDashboardMetricsFromSyncedStats,
  createEmptyUserStats,
  normalizeUserStats,
} from "@/lib/user/synced-statistics";

export async function loadPublicProfileDashboard(
  steamId: string,
  locale: string,
) {
  const user = await getStatRealmUser(steamId);

  if (!user) {
    return null;
  }

  const [tDashboard, tCommon] = await Promise.all([
    getTranslations({ locale, namespace: "dashboard" }),
    getTranslations({ locale, namespace: "common" }),
  ]);
  const formatters = createIntlFormatters(tCommon, tDashboard);
  const steamGameCategory = tDashboard("steamGameCategory");

  const [library, achievementHistory, profileSnapshot] = await Promise.all([
    getUserLibrary(steamId),
    getUserAchievementHistory(steamId),
    getUserProfileAnalytics(steamId),
  ]);
  const [recentlyPlayed, mostPlayed] = await Promise.all([
    buildRecentlyPlayedFromLibrary(library, formatters, steamGameCategory),
    buildMostPlayedFromLibrary(library, formatters, steamGameCategory),
  ]);
  const syncedStats = normalizeUserStats(user.stats ?? createEmptyUserStats());
  const hasLibraryData = library.length > 0;
  const achievements = toDashboardAchievements(achievementHistory);

  return {
    displayName: resolveUserDisplayName(user),
    avatarUrl: resolveUserAvatarUrl(user) || null,
    profileUrl: user.profileUrl,
    steamLevel: syncedStats.steamLevel,
    metrics: buildDashboardMetricsFromSyncedStats(
      syncedStats,
      hasLibraryData,
      tDashboard,
    ),
    recentlyPlayed,
    mostPlayed,
    achievements,
    showAchievementEmptyState:
      achievements.length === 0 &&
      syncedStats.achievementTotalsStatus === "complete" &&
      (syncedStats.totalUnlockedAchievements ?? 0) === 0,
    genres: normalizeStoredGenrePlaytime(profileSnapshot?.genrePlaytime),
    completion: profileSnapshot?.completionOverview ?? null,
  };
}
