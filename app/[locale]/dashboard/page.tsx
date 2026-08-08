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
  getAuthenticatedSteamProfile,
  getOwnedGamesLibrary,
  getRecentlyPlayedGames,
  getSteamLevel,
  type SteamAchievementProgress,
  type SteamOwnedGame,
} from "@/lib/steam/api";
import { enrichDashboardGamesWithSteamImages } from "@/lib/steam/game-images";
import { getGenrePlaytimeSummary } from "@/lib/steam/genre-sync";
import { resolveDashboardAchievementHistory } from "@/lib/steam/achievement-history";
import { syncUserSteamLibrary } from "@/lib/steam/library-sync";
import {
  getStatRealmUser,
  getUserLibrary,
  getUserProfileAnalytics,
  saveUserProfileAnalytics,
} from "@/lib/db";
import type { StatRealmUserStats, UserLibraryGame } from "@/lib/db/types";
import {
  ensureStatRealmUserProfileFresh,
  resolveUserAvatarUrl,
  resolveUserDisplayName,
} from "@/lib/steam/profile-sync";
import {
  buildCompletionOverviewFromLibrary,
  buildProfileMostPlayedCatalog,
  buildRecentlyPlayedFromLibrary,
  normalizeStoredGenrePlaytime,
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

const PERSONA_STATE_KEYS = [
  "offline",
  "online",
  "busy",
  "away",
  "snooze",
  "lookingToTrade",
  "lookingToPlay",
] as const;

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

function toDashboardGame(
  game: SteamOwnedGame,
  progress: SteamAchievementProgress | null,
  completionStatus: "complete" | "unsupported" | "unavailable",
  formatters: ReturnType<typeof createIntlFormatters>,
  steamGameCategory: string,
): DashboardGame {
  const title = game.name?.trim() ?? "";

  return {
    id: String(game.appid),
    title,
    slug: String(game.appid),
    imageUrl: "",
    category: steamGameCategory,
    playtime: formatters.formatPlaytime(game.playtime_forever),
    lastPlayed: formatters.formatLastPlayed(game.rtime_last_played),
    completion:
      progress && progress.total > 0 ? progress.percentage : null,
    completionStatus:
      progress?.total === 0 ? "unsupported" : completionStatus,
  };
}

function getLibraryProgressMaps(library: UserLibraryGame[]) {
  const progressByAppId = new Map<number, SteamAchievementProgress>();
  const achievementStatusByAppId = new Map<
    number,
    "complete" | "unsupported" | "unavailable"
  >();

  for (const game of library) {
    if (game.achievementsTotal === 0) {
      progressByAppId.set(game.appId, {
        unlocked: 0,
        total: 0,
        percentage: 0,
        achievements: [],
      });
      achievementStatusByAppId.set(game.appId, "unsupported");
      continue;
    }

    if (game.achievementsTotal !== null && game.achievementsTotal > 0) {
      progressByAppId.set(game.appId, {
        unlocked: game.achievementsUnlocked ?? 0,
        total: game.achievementsTotal,
        percentage: game.completionPercentage ?? 0,
        achievements: [],
      });
      achievementStatusByAppId.set(game.appId, "complete");
      continue;
    }

    achievementStatusByAppId.set(game.appId, "unavailable");
  }

  return { progressByAppId, achievementStatusByAppId };
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
  const [tDashboard, tCommon, tPersona] = await Promise.all([
    getTranslations("dashboard"),
    getTranslations("common"),
    getTranslations("personaStates"),
  ]);
  logDashboardStepDuration("getTranslations", steamId, translationsStartedAt);

  const formatters = createIntlFormatters(tCommon, tDashboard);
  const steamGameCategory = tDashboard("steamGameCategory");

  const dataFetchStartedAt = performance.now();
  const [
    profileResult,
    ownedResult,
    recentResult,
    levelResult,
    storedUserResult,
    storedLibraryResult,
    profileAnalyticsResult,
  ] = await Promise.allSettled([
    measureDashboardStep("getAuthenticatedSteamProfile", steamId, () =>
      getAuthenticatedSteamProfile(steamId),
    ),
    measureDashboardStep("getOwnedGamesLibrary", steamId, () =>
      getOwnedGamesLibrary(steamId),
    ),
    measureDashboardStep("getRecentlyPlayedGames", steamId, () =>
      getRecentlyPlayedGames(steamId, 8),
    ),
    measureDashboardStep("getSteamLevel", steamId, () =>
      getSteamLevel(steamId),
    ),
    measureDashboardStep("getStatRealmUser", steamId, () =>
      getStatRealmUser(steamId),
    ),
    measureDashboardStep("getUserLibrary", steamId, () =>
      getUserLibrary(steamId),
    ),
    measureDashboardStep("getUserProfileAnalytics", steamId, () =>
      getUserProfileAnalytics(steamId),
    ),
  ]);
  logDashboardStepDuration("parallel:dataFetch", steamId, dataFetchStartedAt);
  if (ownedResult.status === "rejected") {
    console.error("[StatRealm] Dashboard: getOwnedGamesLibrary failed", {
      steamId,
      error: ownedResult.reason,
    });
  }
  const profile =
    profileResult.status === "fulfilled" ? profileResult.value : null;
  const hasLiveOwnedGamesData = ownedResult.status === "fulfilled";
  const ownedGames = hasLiveOwnedGamesData ? ownedResult.value.games : [];
  const ownedGameCount = hasLiveOwnedGamesData
    ? ownedResult.value.gameCount
    : 0;
  const storedUser =
    storedUserResult.status === "fulfilled" ? storedUserResult.value : null;
  const storedLibrary =
    storedLibraryResult.status === "fulfilled" ? storedLibraryResult.value : [];
  const storedStatsSnapshot = normalizeUserStats(
    storedUser?.stats ?? createEmptyUserStats(),
  );
  const hasStoredLibraryData = hasStoredLibrarySnapshot(
    storedLibrary,
    storedStatsSnapshot,
  );
  const hasLibraryData = hasLiveOwnedGamesData || hasStoredLibraryData;
  const profileAnalytics =
    profileAnalyticsResult.status === "fulfilled"
      ? profileAnalyticsResult.value
      : null;
  const initialLastSyncedAt = storedUser?.lastSyncedAt ?? null;
  const backgroundSyncScheduled = shouldScheduleBackgroundSync(
    initialLastSyncedAt,
  );

  if (backgroundSyncScheduled) {
    console.info(
      dashboardTimingLabel("background:scheduleSync", steamId),
      { scheduled: true, hasLiveOwnedGamesData },
    );

    after(async () => {
      const backgroundStartedAt = performance.now();

      try {
        const backgroundFetchStartedAt = performance.now();
        const syncOptions = hasLiveOwnedGamesData
          ? {
              games: ownedGames,
              profile,
              gameCount: ownedGameCount,
            }
          : { profile };
        const [syncResult, genreSummary] = await Promise.all([
          measureDashboardStep("background:syncUserSteamLibrary", steamId, () =>
            syncUserSteamLibrary(steamId, syncOptions),
          ),
          hasLiveOwnedGamesData
            ? measureDashboardStep(
                "background:getGenrePlaytimeSummary",
                steamId,
                () =>
                  getGenrePlaytimeSummary(steamId, ownedGames, session!.expires),
              )
            : Promise.resolve(null),
        ]);
        logDashboardStepDuration(
          "background:parallel:syncAndGenre",
          steamId,
          backgroundFetchStartedAt,
        );

        if (genreSummary?.status === "complete") {
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

        void syncResult;
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

  let recentlyPlayed: DashboardGame[];
  let mostPlayedCatalog: ProfileMostPlayedGame[];

  if (hasLiveOwnedGamesData) {
    const buildGameListsStartedAt = performance.now();
    const { progressByAppId, achievementStatusByAppId } =
      getLibraryProgressMaps(storedLibrary);
    const rawRecentGames =
      recentResult.status === "fulfilled" && recentResult.value.length > 0
        ? recentResult.value
        : [...ownedGames]
            .sort(
              (a, b) =>
                (b.rtime_last_played ?? 0) - (a.rtime_last_played ?? 0),
            )
            .slice(0, 5);
    const ownedGamesByAppId = new Map(
      ownedGames.map((game) => [game.appid, game]),
    );
    const recentGames = rawRecentGames.map((game) => ({
      ...game,
      capsule_filename:
        ownedGamesByAppId.get(game.appid)?.capsule_filename,
    }));
    const recentlyPlayedBase =
      recentGames.length > 0
        ? recentGames
            .slice(0, 5)
            .map((game) =>
              toDashboardGame(
                game,
                progressByAppId.get(game.appid) ?? null,
                achievementStatusByAppId.get(game.appid) ?? "unavailable",
                formatters,
                steamGameCategory,
              ),
            )
        : [];
    const mostPlayedCatalogBase: ProfileMostPlayedGame[] = ownedGames
      .filter(
        (game) =>
          game.playtime_forever > 0 || (game.playtime_2weeks ?? 0) > 0,
      )
      .map((game) => ({
        ...toDashboardGame(
          game,
          progressByAppId.get(game.appid) ?? null,
          achievementStatusByAppId.get(game.appid) ?? "unavailable",
          formatters,
          steamGameCategory,
        ),
        playtimeAllTimeMinutes: game.playtime_forever,
        playtimeTwoWeeksMinutes: game.playtime_2weeks ?? 0,
      }));
    const mostPlayedTopTenBase = [...mostPlayedCatalogBase]
      .filter((game) => game.playtimeAllTimeMinutes > 0)
      .sort(
        (first, second) =>
          second.playtimeAllTimeMinutes - first.playtimeAllTimeMinutes,
      )
      .slice(0, 10);
    const capsuleFilenameByAppId = new Map(
      ownedGames.map((game) => [game.appid, game.capsule_filename]),
    );
    logDashboardStepDuration("buildGameLists", steamId, buildGameListsStartedAt);

    const enrichImagesStartedAt = performance.now();
    const [recentlyPlayedFromLive, mostPlayedTopTenEnriched] = await Promise.all([
      measureDashboardStep(
        "enrichDashboardGamesWithSteamImages:recentlyPlayed",
        steamId,
        () =>
          enrichDashboardGamesWithSteamImages(recentlyPlayedBase, {
            capsuleFilenameByAppId,
            steamId,
          }),
      ),
      measureDashboardStep(
        "enrichDashboardGamesWithSteamImages:mostPlayed",
        steamId,
        () =>
          enrichDashboardGamesWithSteamImages(mostPlayedTopTenBase, {
            capsuleFilenameByAppId,
            steamId,
          }),
      ),
    ]);
    const mostPlayedEnrichedById = new Map(
      mostPlayedTopTenEnriched.map((game) => [game.id, game]),
    );
    recentlyPlayed = recentlyPlayedFromLive;
    mostPlayedCatalog = mostPlayedCatalogBase.map((game) => {
      const enriched = mostPlayedEnrichedById.get(game.id);

      if (!enriched) {
        return game;
      }

      return {
        ...game,
        title: enriched.title,
        slug: enriched.slug,
        imageUrl: enriched.imageUrl,
        imageFallbackUrl: enriched.imageFallbackUrl,
        imageCandidates: enriched.imageCandidates,
      };
    });
    logDashboardStepDuration(
      "parallel:enrichDashboardGamesWithSteamImages",
      steamId,
      enrichImagesStartedAt,
    );
    if (process.env.NODE_ENV !== "production") {
      for (const game of recentlyPlayed) {
        console.info("[Steam Recently Played] Generated image URL", {
          appId: game.id,
          game: game.title,
          primary: game.imageUrl,
          fallback: game.imageFallbackUrl,
          candidateCount: game.imageCandidates?.length ?? 0,
        });
      }
    }
  } else if (hasStoredLibraryData) {
    [recentlyPlayed, mostPlayedCatalog] = await Promise.all([
      measureDashboardStep("buildRecentlyPlayedFromLibrary", steamId, () =>
        buildRecentlyPlayedFromLibrary(
          storedLibrary,
          formatters,
          steamGameCategory,
        ),
      ),
      measureDashboardStep("buildProfileMostPlayedCatalog", steamId, () =>
        buildProfileMostPlayedCatalog(
          storedLibrary,
          formatters,
          steamGameCategory,
        ),
      ),
    ]);
  } else {
    recentlyPlayed = [];
    mostPlayedCatalog = [];
  }
  const recentAchievementState = await measureDashboardStep(
    "resolveDashboardAchievementHistory",
    steamId,
    () =>
      resolveDashboardAchievementHistory({
        steamId,
        summary: null,
      }),
  );
  const realCompletionOverview =
    buildCompletionOverviewFromLibrary(storedLibrary);
  const realGenrePlaytime = normalizeStoredGenrePlaytime(
    profileAnalytics?.genrePlaytime,
  );
  const syncedUser = await measureDashboardStep(
    "ensureStatRealmUserProfileFresh",
    steamId,
    () => ensureStatRealmUserProfileFresh(steamId),
  );
  const syncedStats = enrichStatsFromStoredLibrary(
    normalizeUserStats(
      syncedUser?.stats ?? storedUser?.stats ?? createEmptyUserStats(),
    ),
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
  const displayName = syncedUser
    ? resolveUserDisplayName(syncedUser)
    : profile?.personaname ?? tDashboard("steamPlayerFallback");
  const profileUrl =
    syncedUser?.profileUrl ??
    storedUser?.profileUrl ??
    profile?.profileurl ??
    `https://steamcommunity.com/profiles/${session!.user!.steamId}`;
  const personaState = profile?.personastate ?? 0;
  const status = profile
    ? tPersona(PERSONA_STATE_KEYS[personaState] ?? "online")
    : tCommon("unknown");

  logDashboardStepDuration("render:total", steamId, renderStartedAt);

  return (
    <div className="min-h-screen text-white">
      <DashboardSyncRefresh
        initialLastSyncedAt={initialLastSyncedAt}
        enabled={backgroundSyncScheduled || !hasLibraryData}
      />
      <main className="relative overflow-hidden px-4 py-12 sm:px-6 lg:px-8">
        <div className="relative z-10 mx-auto w-full max-w-7xl space-y-20">
          <DashboardHeader
            displayName={displayName}
            avatarUrl={
              syncedUser
                ? resolveUserAvatarUrl(syncedUser) || profile?.avatarfull
                : profile?.avatarfull ?? session!.user!.image
            }
            profileUrl={profileUrl}
            steamLevel={
              syncedStats.steamLevel ??
              (levelResult.status === "fulfilled" ? levelResult.value : null)
            }
            status={status}
            isOnline={personaState > 0}
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
