import { RecentAchievements } from "@/components/dashboard/RecentAchievements";
import { PlaytimeAnalytics } from "@/components/dashboard/PlaytimeAnalytics";
import {
  buildDashboardAchievementsFromStored,
} from "@/lib/steam/achievement-history";
import {
  buildCompletionOverviewFromLibrary,
  normalizeStoredGenrePlaytime,
} from "@/lib/user/profile-snapshot";
import {
  createEmptyUserStats,
  normalizeUserStats,
} from "@/lib/user/synced-statistics";
import {
  loadDashboardAchievementSnapshot,
  loadDashboardCoreSnapshot,
} from "@/lib/dashboard/load-snapshot";

type DashboardSectionProps = {
  steamId: string;
};

export async function DashboardRecentAchievementsSection({
  steamId,
}: DashboardSectionProps) {
  const [achievementHistory, coreSnapshot] = await Promise.all([
    loadDashboardAchievementSnapshot(steamId),
    loadDashboardCoreSnapshot(steamId),
  ]);

  const recentAchievementState =
    buildDashboardAchievementsFromStored(achievementHistory);
  const syncedStats = normalizeUserStats(
    coreSnapshot.user?.stats ?? createEmptyUserStats(),
  );
  const showAchievementEmptyState =
    recentAchievementState.showEmptyState ||
    (recentAchievementState.achievements.length === 0 &&
      syncedStats.achievementTotalsStatus === "complete" &&
      (syncedStats.totalUnlockedAchievements ?? 0) === 0);

  return (
    <RecentAchievements
      achievements={recentAchievementState.achievements}
      showEmptyState={showAchievementEmptyState}
    />
  );
}

export async function DashboardPlaytimeAnalyticsSection({
  steamId,
}: DashboardSectionProps) {
  const coreSnapshot = await loadDashboardCoreSnapshot(steamId);

  return (
    <PlaytimeAnalytics
      genres={normalizeStoredGenrePlaytime(
        coreSnapshot.profileAnalytics?.genrePlaytime,
      )}
      completion={buildCompletionOverviewFromLibrary(coreSnapshot.library)}
    />
  );
}

export function DashboardRecentAchievementsSkeleton() {
  return (
    <section aria-hidden="true" className="animate-pulse">
      <div className="h-8 w-56 rounded-lg bg-white/10" />
      <div className="mt-6 space-y-4 rounded-xl border border-white/10 bg-white/5 p-5">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex gap-4">
            <div className="h-10 w-10 shrink-0 rounded-lg bg-white/10" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 rounded bg-white/10" />
              <div className="h-3 w-1/3 rounded bg-white/5" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function DashboardPlaytimeAnalyticsSkeleton() {
  return (
    <section aria-hidden="true" className="animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-white/10" />
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="h-56 rounded-xl border border-white/10 bg-white/5" />
        <div className="h-56 rounded-xl border border-white/10 bg-white/5" />
      </div>
    </section>
  );
}
