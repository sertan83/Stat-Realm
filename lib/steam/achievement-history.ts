import "server-only";

import {
  getUserAchievementHistory,
  saveUserAchievementHistory,
} from "@/lib/db";
import type { StoredUnlockedAchievement } from "@/lib/db/types";
import type { DashboardAchievement } from "@/types/dashboard";
import type {
  SteamAchievementLibrarySummary,
  SteamUnlockedAchievement,
} from "@/lib/steam/achievement-sync";

export function toDashboardAchievements(
  achievements: Array<
    SteamUnlockedAchievement | StoredUnlockedAchievement
  >,
): DashboardAchievement[] {
  return achievements.map((achievement) => ({
    id: achievement.id,
    iconUrl: achievement.iconUrl,
    name: achievement.name,
    game: achievement.gameName,
    unlockedAt: achievement.unlockTime,
  }));
}

export function toStoredAchievementHistory(
  achievements: SteamUnlockedAchievement[],
): StoredUnlockedAchievement[] {
  return achievements.map((achievement) => ({
    id: achievement.id,
    appId: achievement.appId,
    apiName: achievement.apiName,
    name: achievement.name,
    gameName: achievement.gameName,
    iconUrl: achievement.iconUrl,
    unlockTime: achievement.unlockTime,
  }));
}

export async function persistAchievementHistory(
  steamId: string,
  summary: SteamAchievementLibrarySummary,
) {
  if (!summary.historySyncCompleted) {
    return;
  }

  await saveUserAchievementHistory(
    steamId,
    toStoredAchievementHistory(summary.unlockedAchievementHistory),
    { replaceExisting: true },
  );
}

export async function resolveDashboardAchievementHistory({
  steamId,
  summary,
}: {
  steamId: string;
  summary: SteamAchievementLibrarySummary | null;
}) {
  const storedHistory = await getUserAchievementHistory(steamId);

  if (
    summary?.historySyncCompleted &&
    summary.unlockedAchievementHistory.length > 0
  ) {
    return {
      achievements: toDashboardAchievements(summary.unlockedAchievementHistory),
      showEmptyState: false,
    };
  }

  if (summary?.historySyncCompleted) {
    return {
      achievements: [],
      showEmptyState: true,
    };
  }

  if (storedHistory.length > 0) {
    return {
      achievements: toDashboardAchievements(storedHistory),
      showEmptyState: false,
    };
  }

  return {
    achievements: [],
    showEmptyState: false,
  };
}
