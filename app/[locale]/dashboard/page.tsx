import { after } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import {
  MostPlayedGames,
  RecentlyPlayed,
} from "@/components/dashboard/DashboardGames";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { PlaytimeAnalytics } from "@/components/dashboard/PlaytimeAnalytics";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentAchievements } from "@/components/dashboard/RecentAchievements";
import { DashboardSyncRefresh } from "@/components/dashboard/DashboardSyncRefresh";
import {
  type SteamOwnedGame,
} from "@/lib/steam/api";
import { getGenrePlaytimeSummary, shouldScheduleGenreSync } from "@/lib/steam/genre-sync";
import { resolveDashboardAchievementHistory } from "@/lib/steam/achievement-history";
import { syncUserSteamLibrary } from "@/lib/steam/library-sync";
import { enrichMissingDashboardGameImagesInBackground } from "@/lib/dashboard/background-game-images";
import {
  applyStoredMetadataToDashboardGame,
  collectUniqueDashboardGames,
  selectGamesForBackgroundImageEnrichment,
} from "@/lib/dashboard/game-images";
import {
  getStatRealmUser,
  getStoredGameMetadataForAppIds,
  getUserAchievementHistory,
  getUserLibrary,
  getUserProfileAnalytics,
  saveUserProfileAnalytics,
} from "@/lib/db";
import type { StatRealmUserStats, UserLibraryGame } from "@/lib/db/types";
import {
  refreshSteamProfilesFromApi,
  resolveUserAvatarUrl,
  resolveUserDisplayName,
  userNeedsProfileRefresh,
} from "@/lib/steam/profile-sync";
import {
  buildCompletionOverviewFromLibrary,
  normalizeStoredGenrePlaytime,
  toDashboardGameFromLibraryGame,
} from "@/lib/user/profile-snapshot";
import {
  buildDashboardMetricsFromSyncedStats,
  createEmptyUserStats,
  normalizeUserStats,
} from "@/lib/user/synced-statistics";
import { createIntlFormatters } from "@/lib/i18n/formatters";
import type {
  DashboardGame,
  ProfileMostPlayedGame,
} from "@/types/dashboard";
import { auth } from "@/auth";

const BACKGROUND_SYNC_MIN_INTERVAL_MS = 60_000;
const DASHBOARD_TIMING_PREFIX = "[StatRealm Dashboard Timing]";

type DashboardPageProps = {
  params: Promise<{ locale: string }>;
};

function dashboardTimingLabel(step: string, steamId?: string) {
  return steamId
    ? `${DASHBOARD_TIMING_PREFIX} ${step}:${steamId}`
    : `${DASHBOARD_TIMING_PREFIX} ${step}`;
}

async function measureDashboardStep<T>(
  step: string,
  steamId: string,
  operation: () => Promise<T>,
): Promise<T> {
  const startedAt = performance.now();

  try {
    return await operation();
  } finally {
    console.info(dashboardTimingLabel(step, steamId), {
      durationMs: Math.round(performance.now() - startedAt),
    });
  }
}

function logDashboardStepDuration(
  step: string,
  steamId: string,
  startedAt: number,
) {
  console.info(dashboardTimingLabel(step, steamId), {
    durationMs: Math.round(performance.now() - startedAt),
  });
}

function shouldScheduleBackgroundSync(lastSyncedAt: string | null | undefined) {
  if (!lastSyncedAt) {
    return true;
  }

  return (
    Date.now() - new Date(lastSyncedAt).getTime() >=
    BACKGROUND_SYNC_MIN_INTERVAL_MS
  );
}

function hasStoredLibrarySnapshot(
  library: UserLibraryGame[],
  stats: StatRealmUserStats,
) {
  return (
    library.length > 0 ||
    stats.totalGames > 0 ||
    stats.totalPlaytimeMinutes > 0
  );
}

function enrichStatsFromStoredLibrary(
  stats: StatRealmUserStats,
  library: UserLibraryGame[],
): StatRealmUserStats {
  if (
    library.length === 0 ||
    stats.totalGames > 0 ||
    stats.totalPlaytimeMinutes > 0
  ) {
    return stats;
  }

  return {
    ...stats,
    totalGames: library.length,
    totalPlaytimeMinutes: library.reduce(
      (total, game) => total + game.playtimeMinutes,
      0,
    ),
  };
}

function storedLibraryToOwnedGames(
  library: UserLibraryGame[],
): SteamOwnedGame[] {
  return library.map((game) => ({
    appid: game.appId,
    name: game.name,
    playtime_forever: game.playtimeMinutes,
    playtime_2weeks: game.playtimeTwoWeeksMinutes,
    rtime_last_played: game.lastPlayedAt ?? undefined,
  }));
}

function getLatestIsoTimestamp(
  timestamps: Array<string | null | undefined>,
) {
  let latest: string | null = null;
  let latestMs = -1;

  for (const timestamp of timestamps) {
    if (!timestamp) {
      continue;
    }

    const parsed = new Date(timestamp).getTime();
    if (Number.isFinite(parsed) && parsed > latestMs) {
      latestMs = parsed;
      latest = timestamp;
    }
  }

  return latest;
}

function buildRecentlyPlayedGamesFromLibrary(
  library: UserLibraryGame[],
  formatters: ReturnType<typeof createIntlFormatters>,
  steamGameCategory: string,
): DashboardGame[] {
  const mapGame = (game: UserLibraryGame) =>
    toDashboardGameFromLibraryGame(game, formatters, steamGameCategory);

  const recentlyPlayed = [...library]
    .filter(
      (game) => game.lastPlayedAt !== null && game.lastPlayedAt > 0,
    )
    .sort(
      (first, second) =>
        (second.lastPlayedAt ?? 0) - (first.lastPlayedAt ?? 0),
    )
    .slice(0, 5)
    .map(mapGame);

  if (recentlyPlayed.length > 0) {
    return recentlyPlayed;
  }

  return [...library]
    .filter((game) => game.playtimeTwoWeeksMinutes > 0)
    .sort(
      (first, second) =>
        second.playtimeTwoWeeksMinutes - first.playtimeTwoWeeksMinutes,
    )
    .slice(0, 5)
    .map(mapGame);
}

function buildMostPlayedCatalogFromLibrary(
  library: UserLibraryGame[],
  formatters: ReturnType<typeof createIntlFormatters>,
  steamGameCategory: string,
): ProfileMostPlayedGame[] {
  return library
    .filter(
      (game) => game.playtimeMinutes > 0 || game.playtimeTwoWeeksMinutes > 0,
    )
    .map((game) => ({
      ...toDashboardGameFromLibraryGame(game, formatters, steamGameCategory),
      playtimeAllTimeMinutes: game.playtimeMinutes,
      playtimeTwoWeeksMinutes: game.playtimeTwoWeeksMinutes,
    }));
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const renderStartedAt = performance.now();
  const { locale } = await params;
  setRequestLocale(locale);

  const authStartedAt = performance.now();
  const session = await auth();

  if (!session?.user?.steamId) {
    logDashboardStepDuration("auth", "unknown", authStartedAt);
    redirect({ href: "/", locale });
  }

  const steamId = session!.user!.steamId;
  logDashboardStepDuration("auth", steamId, authStartedAt);

  const translationsStartedAt = performance.now();
  const [tDashboard, tCommon] = await Promise.all([
    getTranslations("dashboard"),
    getTranslations("common"),
  ]);
  logDashboardStepDuration("getTranslations", steamId, translationsStartedAt);

  const formatters = createIntlFormatters(tCommon, tDashboard);
  const steamGameCategory = tDashboard("steamGameCategory");

  const dataFetchStartedAt = performance.now();
  const [
    storedUserResult,
    storedLibraryResult,
    profileAnalyticsResult,
    achievementHistoryResult,
  ] = await Promise.allSettled([
    measureDashboardStep("getStatRealmUser", steamId, () =>
      getStatRealmUser(steamId),
    ),
    measureDashboardStep("getUserLibrary", steamId, () =>
      getUserLibrary(steamId),
    ),
    measureDashboardStep("getUserProfileAnalytics", steamId, () =>
      getUserProfileAnalytics(steamId),
    ),
    measureDashboardStep("getUserAchievementHistory", steamId, () =>
      getUserAchievementHistory(steamId),
    ),
  ]);
  logDashboardStepDuration("parallel:dataFetch", steamId, dataFetchStartedAt);

  const storedUser =
    storedUserResult.status === "fulfilled" ? storedUserResult.value : null;
  const storedLibrary =
    storedLibraryResult.status === "fulfilled" ? storedLibraryResult.value : [];
  const storedAchievementHistory =
    achievementHistoryResult.status === "fulfilled"
      ? achievementHistoryResult.value
      : [];
  const storedStatsSnapshot = normalizeUserStats(
    storedUser?.stats ?? createEmptyUserStats(),
  );
  const hasStoredLibraryData = hasStoredLibrarySnapshot(
    storedLibrary,
    storedStatsSnapshot,
  );
  const hasLibraryData = hasStoredLibraryData;
  const profileAnalytics =
    profileAnalyticsResult.status === "fulfilled"
      ? profileAnalyticsResult.value
      : null;
  const initialLastSyncedAt = storedUser?.lastSyncedAt ?? null;
  const initialProfileAnalyticsSyncedAt = profileAnalytics?.syncedAt ?? null;
  const initialRefreshMarker = getLatestIsoTimestamp([
    initialLastSyncedAt,
    initialProfileAnalyticsSyncedAt,
  ]);
  const genreSyncGames = storedLibraryToOwnedGames(storedLibrary);
  const hasGenreSyncGames = genreSyncGames.some(
    (game) => game.playtime_forever > 0,
  );
  const genreSyncScheduled =
    hasGenreSyncGames &&
    shouldScheduleGenreSync(
      profileAnalytics?.syncedAt,
      (profileAnalytics?.genrePlaytime?.length ?? 0) > 0,
    );
  const backgroundSyncScheduled =
    shouldScheduleBackgroundSync(initialLastSyncedAt) || !hasStoredLibraryData;
  const profileRefreshScheduled =
    storedUser !== null && userNeedsProfileRefresh(storedUser);

  if (backgroundSyncScheduled) {
    console.info(
      dashboardTimingLabel("background:scheduleSync", steamId),
      { scheduled: true },
    );

    after(async () => {
      const backgroundStartedAt = performance.now();

      try {
        await measureDashboardStep("background:syncUserSteamLibrary", steamId, () =>
          syncUserSteamLibrary(steamId),
        );
      } catch (error) {
        console.error(
          "[StatRealm] Failed to sync Steam library on dashboard",
          {
            steamId,
            error,
          },
        );
      } finally {
        logDashboardStepDuration("background:total", steamId, backgroundStartedAt);
      }
    });
  } else {
    console.info(
      dashboardTimingLabel("background:scheduleSync", steamId),
      { scheduled: false },
    );
  }

  if (profileRefreshScheduled) {
    after(async () => {
      try {
        await measureDashboardStep(
          "background:refreshSteamProfilesFromApi",
          steamId,
          () => refreshSteamProfilesFromApi([steamId]),
        );
      } catch (error) {
        console.error("[StatRealm] Failed to refresh Steam profile on dashboard", {
          steamId,
          error,
        });
      }
    });
  }

  if (genreSyncScheduled) {
    console.info(
      dashboardTimingLabel("background:scheduleGenreSync", steamId),
      { scheduled: true },
    );

    after(async () => {
      const genreBackgroundStartedAt = performance.now();

      try {
        const genreSummary = await measureDashboardStep(
          "background:getGenrePlaytimeSummary",
          steamId,
          () =>
            getGenrePlaytimeSummary(
              steamId,
              genreSyncGames,
              session!.expires,
            ),
        );

        if (genreSummary.status === "complete") {
          await measureDashboardStep(
            "background:saveUserProfileAnalytics",
            steamId,
            () =>
              saveUserProfileAnalytics(steamId, {
                genrePlaytime:
                  genreSummary.genres.length > 0 ? genreSummary.genres : null,
              }),
          );
        }
      } catch (error) {
        console.error("[StatRealm] Failed to sync genre playtime on dashboard", {
          steamId,
          error,
        });
      } finally {
        logDashboardStepDuration(
          "background:genreSync:total",
          steamId,
          genreBackgroundStartedAt,
        );
      }
    });
  } else {
    console.info(
      dashboardTimingLabel("background:scheduleGenreSync", steamId),
      { scheduled: false },
    );
  }

  const buildGameListsStartedAt = performance.now();
  let recentlyPlayed = hasStoredLibraryData
    ? buildRecentlyPlayedGamesFromLibrary(
        storedLibrary,
        formatters,
        steamGameCategory,
      )
    : [];
  let mostPlayedCatalog = hasStoredLibraryData
    ? buildMostPlayedCatalogFromLibrary(
        storedLibrary,
        formatters,
        steamGameCategory,
      )
    : [];
  const dashboardAppIds = collectUniqueDashboardGames(
    recentlyPlayed,
    mostPlayedCatalog,
  )
    .map((game) => Number(game.id))
    .filter((appId) => Number.isInteger(appId) && appId > 0);
  const storedGameMetadataByAppId =
    dashboardAppIds.length > 0
      ? await measureDashboardStep(
          "getStoredGameMetadataForAppIds",
          steamId,
          () => getStoredGameMetadataForAppIds(dashboardAppIds),
        )
      : new Map();
  recentlyPlayed = recentlyPlayed.map((game) =>
    applyStoredMetadataToDashboardGame(
      game,
      storedGameMetadataByAppId.get(Number(game.id)),
    ),
  );
  mostPlayedCatalog = mostPlayedCatalog.map((game) =>
    applyStoredMetadataToDashboardGame(
      game,
      storedGameMetadataByAppId.get(Number(game.id)),
    ),
  );
  const gamesNeedingImageEnrichment = selectGamesForBackgroundImageEnrichment(
    recentlyPlayed,
    mostPlayedCatalog,
    collectUniqueDashboardGames(recentlyPlayed, mostPlayedCatalog),
    storedGameMetadataByAppId,
  );
  const imageEnrichmentScheduled = gamesNeedingImageEnrichment.length > 0;
  logDashboardStepDuration("buildGameLists", steamId, buildGameListsStartedAt);

  if (imageEnrichmentScheduled) {
    console.info(
      dashboardTimingLabel("background:scheduleImageEnrichment", steamId),
      {
        scheduled: true,
        pendingGames: gamesNeedingImageEnrichment.length,
      },
    );

    after(async () => {
      const imageEnrichmentStartedAt = performance.now();

      try {
        await measureDashboardStep(
          "background:enrichMissingDashboardGameImages",
          steamId,
          () =>
            enrichMissingDashboardGameImagesInBackground(
              steamId,
              gamesNeedingImageEnrichment,
            ),
        );
      } finally {
        logDashboardStepDuration(
          "background:imageEnrichment:total",
          steamId,
          imageEnrichmentStartedAt,
        );
      }
    });
  } else {
    console.info(
      dashboardTimingLabel("background:scheduleImageEnrichment", steamId),
      { scheduled: false },
    );
  }

  const recentAchievementState = await measureDashboardStep(
    "resolveDashboardAchievementHistory",
    steamId,
    () =>
      resolveDashboardAchievementHistory({
        steamId,
        summary: null,
        storedHistory: storedAchievementHistory,
      }),
  );
  const realCompletionOverview =
    buildCompletionOverviewFromLibrary(storedLibrary);
  const realGenrePlaytime = normalizeStoredGenrePlaytime(
    profileAnalytics?.genrePlaytime,
  );
  const syncedStats = enrichStatsFromStoredLibrary(
    normalizeUserStats(storedUser?.stats ?? createEmptyUserStats()),
    storedLibrary,
  );
  const showAchievementEmptyState =
    recentAchievementState.showEmptyState ||
    (recentAchievementState.achievements.length === 0 &&
      syncedStats.achievementTotalsStatus === "complete" &&
      (syncedStats.totalUnlockedAchievements ?? 0) === 0);
  const profileMetrics = buildDashboardMetricsFromSyncedStats(
    syncedStats,
    hasLibraryData,
    tDashboard,
  );
  const displayName = storedUser
    ? resolveUserDisplayName(storedUser)
    : tDashboard("steamPlayerFallback");
  const profileUrl =
    storedUser?.profileUrl ??
    `https://steamcommunity.com/profiles/${session!.user!.steamId}`;
  const status = tCommon("unknown");

  logDashboardStepDuration("render:total", steamId, renderStartedAt);

  return (
    <div className="min-h-screen text-white">
      <DashboardSyncRefresh
        initialLastSyncedAt={initialRefreshMarker}
        enabled={
          backgroundSyncScheduled ||
          genreSyncScheduled ||
          imageEnrichmentScheduled ||
          !hasLibraryData
        }
      />
      <main className="relative overflow-hidden px-4 py-12 sm:px-6 lg:px-8">
        <div className="relative z-10 mx-auto w-full max-w-7xl space-y-20">
          <DashboardHeader
            displayName={displayName}
            avatarUrl={
              storedUser
                ? resolveUserAvatarUrl(storedUser) || session!.user!.image
                : session!.user!.image
            }
            profileUrl={profileUrl}
            steamLevel={syncedStats.steamLevel}
            status={status}
            isOnline={false}
          />

          <DashboardStats metrics={profileMetrics} />

          <RecentlyPlayed games={recentlyPlayed} />

          <div className="grid gap-12 lg:grid-cols-2">
            <MostPlayedGames games={mostPlayedCatalog} />
            <RecentAchievements
              achievements={recentAchievementState.achievements}
              showEmptyState={showAchievementEmptyState}
            />
          </div>

          <PlaytimeAnalytics
            genres={realGenrePlaytime}
            completion={realCompletionOverview}
          />

          <QuickActions profileUrl={profileUrl} />
        </div>
      </main>
    </div>
  );
}
