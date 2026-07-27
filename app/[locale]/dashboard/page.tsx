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
import type { UserLibraryGame } from "@/lib/db/types";
import {
  ensureStatRealmUserProfileFresh,
  resolveUserAvatarUrl,
  resolveUserDisplayName,
} from "@/lib/steam/profile-sync";
import {
  buildCompletionOverviewFromLibrary,
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

type DashboardPageProps = {
  params: Promise<{ locale: string }>;
};

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

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();

  if (!session?.user?.steamId) {
    redirect({ href: "/", locale });
  }

  const [tDashboard, tCommon, tPersona] = await Promise.all([
    getTranslations("dashboard"),
    getTranslations("common"),
    getTranslations("personaStates"),
  ]);
  const formatters = createIntlFormatters(tCommon, tDashboard);
  const steamGameCategory = tDashboard("steamGameCategory");

  const steamId = session!.user!.steamId;
  const [
    profileResult,
    ownedResult,
    recentResult,
    levelResult,
    storedUserResult,
    storedLibraryResult,
    profileAnalyticsResult,
  ] = await Promise.allSettled([
    getAuthenticatedSteamProfile(steamId),
    getOwnedGamesLibrary(steamId),
    getRecentlyPlayedGames(steamId, 8),
    getSteamLevel(steamId),
    getStatRealmUser(steamId),
    getUserLibrary(steamId),
    getUserProfileAnalytics(steamId),
  ]);
  const profile =
    profileResult.status === "fulfilled" ? profileResult.value : null;
  const hasOwnedGamesData = ownedResult.status === "fulfilled";
  const ownedGames = hasOwnedGamesData ? ownedResult.value.games : [];
  const ownedGameCount = hasOwnedGamesData
    ? ownedResult.value.gameCount
    : 0;
  const storedUser =
    storedUserResult.status === "fulfilled" ? storedUserResult.value : null;
  const storedLibrary =
    storedLibraryResult.status === "fulfilled" ? storedLibraryResult.value : [];
  const profileAnalytics =
    profileAnalyticsResult.status === "fulfilled"
      ? profileAnalyticsResult.value
      : null;
  const initialLastSyncedAt = storedUser?.lastSyncedAt ?? null;
  const backgroundSyncScheduled =
    hasOwnedGamesData &&
    shouldScheduleBackgroundSync(initialLastSyncedAt);

  if (backgroundSyncScheduled) {
    after(async () => {
      try {
        const [syncResult, genreSummary] = await Promise.all([
          syncUserSteamLibrary(steamId, {
            games: ownedGames,
            profile,
            gameCount: ownedGameCount,
          }),
          getGenrePlaytimeSummary(steamId, ownedGames, session!.expires),
        ]);

        if (genreSummary?.status === "complete") {
          await saveUserProfileAnalytics(steamId, {
            genrePlaytime:
              genreSummary.genres.length > 0 ? genreSummary.genres : null,
          });
        }

      } catch (error) {
        console.error(
          "[StatRealm] Failed to sync Steam library on dashboard",
          {
            steamId,
            error,
          },
        );
      }
    });
  }

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
  const capsuleFilenameByAppId = new Map(
    ownedGames.map((game) => [game.appid, game.capsule_filename]),
  );
  const [recentlyPlayed, mostPlayedCatalog] = await Promise.all([
    enrichDashboardGamesWithSteamImages(recentlyPlayedBase, {
      capsuleFilenameByAppId,
      steamId,
    }),
    enrichDashboardGamesWithSteamImages(mostPlayedCatalogBase, {
      capsuleFilenameByAppId,
      steamId,
    }),
  ]);
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
  const recentAchievementState = await resolveDashboardAchievementHistory({
    steamId,
    summary: null,
  });
  const realCompletionOverview =
    buildCompletionOverviewFromLibrary(storedLibrary);
  const realGenrePlaytime = normalizeStoredGenrePlaytime(
    profileAnalytics?.genrePlaytime,
  );
  const syncedUser = await ensureStatRealmUserProfileFresh(steamId);
  const syncedStats = normalizeUserStats(
    syncedUser?.stats ?? storedUser?.stats ?? createEmptyUserStats(),
  );
  const showAchievementEmptyState =
    recentAchievementState.showEmptyState ||
    (recentAchievementState.achievements.length === 0 &&
      syncedStats.achievementTotalsStatus === "complete" &&
      (syncedStats.totalUnlockedAchievements ?? 0) === 0);
  const profileMetrics = buildDashboardMetricsFromSyncedStats(
    syncedStats,
    hasOwnedGamesData,
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

  return (
    <div className="min-h-screen text-white">
      <DashboardSyncRefresh
        initialLastSyncedAt={initialLastSyncedAt}
        enabled={hasOwnedGamesData}
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
