import { Suspense } from "react";
import { after } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";

export const dynamic = "force-dynamic";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import {
  MostPlayedGames,
  RecentlyPlayed,
} from "@/components/dashboard/DashboardGames";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import {
  DashboardPlaytimeAnalyticsSection,
  DashboardPlaytimeAnalyticsSkeleton,
  DashboardRecentAchievementsSection,
  DashboardRecentAchievementsSkeleton,
} from "@/components/dashboard/DashboardDeferredSections";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { DashboardSyncRefresh } from "@/components/dashboard/DashboardSyncRefresh";
import {
  type SteamOwnedGame,
} from "@/lib/steam/api";
import { getGenrePlaytimeSummary, shouldScheduleGenreSync } from "@/lib/steam/genre-sync";
import { syncUserSteamLibrary } from "@/lib/steam/library-sync";
import { enrichMissingDashboardGameImagesInBackground } from "@/lib/dashboard/background-game-images";
import {
  loadDashboardCoreSnapshot,
} from "@/lib/dashboard/load-snapshot";
import {
  applyStoredMetadataToDashboardGame,
  collectUniqueDashboardGames,
  selectGamesForBackgroundImageEnrichment,
} from "@/lib/dashboard/game-images";
import { saveUserProfileAnalytics } from "@/lib/db";
import type { StatRealmUserStats, UserLibraryGame } from "@/lib/db/types";
import {
  refreshSteamProfilesFromApi,
  resolveUserAvatarUrl,
  resolveUserDisplayName,
  userNeedsProfileRefresh,
} from "@/lib/steam/profile-sync";
import {
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
  const coreSnapshot = await measureDashboardStep(
    "loadDashboardCoreSnapshot",
    steamId,
    () => loadDashboardCoreSnapshot(steamId),
  );
  logDashboardStepDuration("parallel:dataFetch", steamId, dataFetchStartedAt);

  const storedUser = coreSnapshot.user;
  const storedLibrary = coreSnapshot.library;
  const storedStatsSnapshot = normalizeUserStats(
    storedUser?.stats ?? createEmptyUserStats(),
  );
  const hasStoredLibraryData = hasStoredLibrarySnapshot(
    storedLibrary,
    storedStatsSnapshot,
  );
  const hasLibraryData = hasStoredLibraryData;
  const profileAnalytics = coreSnapshot.profileAnalytics;
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
        coreSnapshot.mostPlayedLibrary,
        formatters,
        steamGameCategory,
      )
    : [];
  recentlyPlayed = recentlyPlayed.map((game) =>
    applyStoredMetadataToDashboardGame(game, undefined),
  );
  mostPlayedCatalog = mostPlayedCatalog.map((game) =>
    applyStoredMetadataToDashboardGame(game, undefined),
  );
  const gamesNeedingImageEnrichment = selectGamesForBackgroundImageEnrichment(
    recentlyPlayed,
    mostPlayedCatalog,
    collectUniqueDashboardGames(recentlyPlayed, mostPlayedCatalog),
    new Map(),
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

  const syncedStats = enrichStatsFromStoredLibrary(
    normalizeUserStats(storedUser?.stats ?? createEmptyUserStats()),
    storedLibrary,
  );
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
            <Suspense fallback={<DashboardRecentAchievementsSkeleton />}>
              <DashboardRecentAchievementsSection steamId={steamId} />
            </Suspense>
          </div>

          <Suspense fallback={<DashboardPlaytimeAnalyticsSkeleton />}>
            <DashboardPlaytimeAnalyticsSection steamId={steamId} />
          </Suspense>

          <QuickActions profileUrl={profileUrl} />
        </div>
      </main>
    </div>
  );
}
