import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import {
  MostPlayedGames,
  RecentlyPlayed,
} from "@/components/dashboard/DashboardGames";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { PlaytimeAnalytics } from "@/components/dashboard/PlaytimeAnalytics";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentAchievements } from "@/components/dashboard/RecentAchievements";
import { slugifyGameName } from "@/lib/slugify-game-name";
import {
  formatLastPlayed,
  formatPlaytime,
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
import { saveUserProfileAnalytics } from "@/lib/db";
import {
  ensureStatRealmUserProfileFresh,
  resolveUserAvatarUrl,
  resolveUserDisplayName,
} from "@/lib/steam/profile-sync";
import {
  buildDashboardMetricsFromSyncedStats,
  createEmptyUserStats,
  normalizeUserStats,
} from "@/lib/user/synced-statistics";
import type {
  CompletionOverview,
  DashboardGame,
} from "@/types/dashboard";
import { auth } from "@/auth";

const personaStates = [
  "Offline",
  "Online",
  "Busy",
  "Away",
  "Snooze",
  "Looking to trade",
  "Looking to play",
];

function toDashboardGame(
  game: SteamOwnedGame,
  progress: SteamAchievementProgress | null,
  completionStatus: "complete" | "unsupported" | "unavailable",
): DashboardGame {
  const title = game.name ?? `Steam App ${game.appid}`;

  return {
    id: String(game.appid),
    title,
    slug: slugifyGameName(title),
    imageUrl: "",
    category: "Steam Game",
    playtime: formatPlaytime(game.playtime_forever),
    lastPlayed: formatLastPlayed(game.rtime_last_played),
    completion:
      progress && progress.total > 0 ? progress.percentage : null,
    completionStatus:
      progress?.total === 0 ? "unsupported" : completionStatus,
  };
}

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  const steamId = session.user.steamId;
  const [profileResult, ownedResult, recentResult, levelResult] =
    await Promise.allSettled([
      getAuthenticatedSteamProfile(steamId),
      getOwnedGamesLibrary(steamId),
      getRecentlyPlayedGames(steamId, 8),
      getSteamLevel(steamId),
    ]);
  const profile =
    profileResult.status === "fulfilled" ? profileResult.value : null;
  const hasOwnedGamesData = ownedResult.status === "fulfilled";
  const ownedGames = hasOwnedGamesData ? ownedResult.value.games : [];
  const ownedGameCount = hasOwnedGamesData
    ? ownedResult.value.gameCount
    : 0;
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
  const topGames = [...ownedGames]
    .sort((a, b) => b.playtime_forever - a.playtime_forever)
    .slice(0, 10);
  const [syncResult, genreSummary] = hasOwnedGamesData
    ? await Promise.all([
        syncUserSteamLibrary(steamId, {
          games: ownedGames,
          profile,
          gameCount: ownedGameCount,
        }).catch((error) => {
          console.error(
            "[StatRealm] Failed to sync Steam library on dashboard",
            {
              steamId,
              error,
            },
          );
          return null;
        }),
        getGenrePlaytimeSummary(steamId, ownedGames, session.expires),
      ])
    : [null, null];

  if (hasOwnedGamesData && genreSummary?.status === "complete") {
    await saveUserProfileAnalytics(steamId, {
      genrePlaytime:
        genreSummary.genres.length > 0 ? genreSummary.genres : null,
    });
  }

  const achievementSummary = syncResult?.achievementSummary ?? null;
  const progressByAppId =
    achievementSummary?.progressByAppId ??
    new Map<number, SteamAchievementProgress>();
  const recentlyPlayedBase =
    recentGames.length > 0
      ? recentGames
          .slice(0, 5)
          .map((game) =>
            toDashboardGame(
              game,
              progressByAppId.get(game.appid) ?? null,
              achievementSummary?.achievementStatusByAppId.get(
                game.appid,
              ) ?? "unavailable",
            ),
          )
      : [];
  const mostPlayedBase =
    topGames.length > 0
      ? topGames.map((game) =>
          toDashboardGame(
            game,
            progressByAppId.get(game.appid) ?? null,
            achievementSummary?.achievementStatusByAppId.get(
              game.appid,
            ) ?? "unavailable",
          ),
        )
      : [];
  const capsuleFilenameByAppId = new Map(
    ownedGames.map((game) => [game.appid, game.capsule_filename]),
  );
  const [recentlyPlayed, mostPlayed] = await Promise.all([
    enrichDashboardGamesWithSteamImages(recentlyPlayedBase, {
      capsuleFilenameByAppId,
    }),
    enrichDashboardGamesWithSteamImages(mostPlayedBase, {
      capsuleFilenameByAppId,
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
    summary: achievementSummary,
  });
  const completionGames = achievementSummary
    ? Array.from(achievementSummary.progressByAppId.values()).filter(
        (progress: SteamAchievementProgress) => progress.total > 0,
      )
    : null;
  let realCompletionOverview: CompletionOverview | null = null;

  if (completionGames && completionGames.length > 0) {
    const completedGames = completionGames.filter(
      (progress) => progress.unlocked === progress.total,
    ).length;
    const inProgressGames = completionGames.filter(
      (progress) =>
        progress.unlocked > 0 && progress.unlocked < progress.total,
    ).length;
    const untouchedGames =
      completionGames.length - completedGames - inProgressGames;

    realCompletionOverview = {
      completed: (completedGames / completionGames.length) * 100,
      inProgress: (inProgressGames / completionGames.length) * 100,
      untouched: (untouchedGames / completionGames.length) * 100,
    };
  }
  const realGenrePlaytime =
    genreSummary && genreSummary.genres.length > 0
      ? genreSummary.genres
      : null;
  const syncedUser = await ensureStatRealmUserProfileFresh(steamId);
  const syncedStats = normalizeUserStats(
    syncedUser?.stats ?? createEmptyUserStats(),
  );
  const profileMetrics = buildDashboardMetricsFromSyncedStats(
    syncedStats,
    hasOwnedGamesData,
  );
  const displayName = syncedUser
    ? resolveUserDisplayName(syncedUser)
    : profile?.personaname ?? "Steam Player";
  const profileUrl =
    syncedUser?.profileUrl ??
    profile?.profileurl ??
    `https://steamcommunity.com/profiles/${session.user.steamId}`;
  const personaState = profile?.personastate ?? 0;
  const status = profile ? (personaStates[personaState] ?? "Online") : "Unknown";

  return (
    <div className="min-h-screen text-white">
      <Navbar />

      <main className="relative overflow-hidden px-4 py-12 sm:px-6 lg:px-8">

        <div className="relative z-10 mx-auto w-full max-w-7xl space-y-20">
          <DashboardHeader
            displayName={displayName}
            avatarUrl={
              syncedUser
                ? resolveUserAvatarUrl(syncedUser) || profile?.avatarfull
                : profile?.avatarfull ?? session.user.image
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
            <MostPlayedGames games={mostPlayed} />
            <RecentAchievements
              achievements={recentAchievementState.achievements}
              showEmptyState={recentAchievementState.showEmptyState}
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
