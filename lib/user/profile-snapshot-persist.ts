import "server-only";

import type { StoredUnlockedAchievement } from "@/lib/db/types";
import type { SteamAchievementLibrarySummary } from "@/lib/steam/achievement-sync";
import { toStoredAchievementHistory } from "@/lib/steam/achievement-history";
import { buildCompletionOverviewFromAchievementSummary } from "@/lib/user/profile-snapshot";

export function buildSyncSnapshotProfileAnalytics(
  achievementSummary: SteamAchievementLibrarySummary,
) {
  return {
    completionOverview:
      buildCompletionOverviewFromAchievementSummary(achievementSummary),
  };
}

export function buildSyncSnapshotAchievementHistory(
  achievementSummary: SteamAchievementLibrarySummary,
): StoredUnlockedAchievement[] | undefined {
  if (!achievementSummary.historySyncCompleted) {
    return undefined;
  }

  return toStoredAchievementHistory(
    achievementSummary.unlockedAchievementHistory,
  );
}
