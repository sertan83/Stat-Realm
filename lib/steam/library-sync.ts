import "server-only";

import type { SteamProfile } from "@/lib/auth/steam";
import { commitUserSyncSnapshot, getStatRealmUser, getUserAchievementHistory, getUserLibrary } from "@/lib/db";
import type { StatRealmUserStats, UserLibraryGame } from "@/lib/db/types";
import { GAME_NAME_LOADING_LABEL } from "@/lib/game-metadata/constants";
import { resolveGameMetadataBatch } from "@/lib/steam/game-metadata";
import {
  getAchievementLibrarySummary,
  shouldRefreshAchievementHistory,
} from "@/lib/steam/achievement-sync";
import {
  buildSyncSnapshotAchievementHistory,
  buildSyncSnapshotProfileAnalytics,
} from "@/lib/user/profile-snapshot-persist";
import { steamProfileToStoredFields } from "@/lib/steam/profile-sync";
import {
  getAuthenticatedSteamProfile,
  getOwnedGamesLibrary,
  getSteamLevel,
  type SteamOwnedGame,
} from "@/lib/steam/api";
import { createEmptyUserStats } from "@/lib/user/synced-statistics";

function toUserLibraryGames(
  games: SteamOwnedGame[],
  achievementSummary: Awaited<ReturnType<typeof getAchievementLibrarySummary>>,
  storedLibraryByAppId: Map<number, UserLibraryGame>,
): UserLibraryGame[] {
  return games.map((game) => {
    const progress = achievementSummary.progressByAppId.get(game.appid) ?? null;
    const storedGame = storedLibraryByAppId.get(game.appid);
    const achievementsUnlocked =
      progress?.unlocked ?? storedGame?.achievementsUnlocked ?? null;
    const achievementsTotal =
      progress?.total ?? storedGame?.achievementsTotal ?? null;
    const completionPercentage =
      progress && progress.total > 0
        ? progress.percentage
        : storedGame?.completionPercentage ?? null;
    const perfectGame =
      progress && progress.total > 0
        ? progress.unlocked === progress.total
        : storedGame?.perfectGame ?? null;

    return {
      appId: game.appid,
      name: game.name?.trim() || "",
      playtimeMinutes: game.playtime_forever ?? 0,
      playtimeTwoWeeksMinutes: game.playtime_2weeks ?? 0,
      lastPlayedAt:
        typeof game.rtime_last_played === "number" && game.rtime_last_played > 0
          ? game.rtime_last_played
          : null,
      achievementsUnlocked,
      achievementsTotal,
      completionPercentage,
      perfectGame,
    };
  });
}

async function resolveLibraryGameNames(
  libraryGames: UserLibraryGame[],
  steamId: string,
) {
  const unresolvedAppIds = libraryGames
    .filter((game) => !game.name.trim())
    .map((game) => game.appId);

  if (unresolvedAppIds.length === 0) {
    return libraryGames;
  }

  const names = await resolveGameMetadataBatch(unresolvedAppIds, { steamId });

  return libraryGames.map((game) => ({
    ...game,
    name: game.name.trim() || names.get(game.appId) || GAME_NAME_LOADING_LABEL,
  }));
}

function buildSyncedUserStats(
  libraryGames: UserLibraryGame[],
  gameCount: number,
  achievementSummary: Awaited<ReturnType<typeof getAchievementLibrarySummary>>,
  steamLevel: number | null,
  countryCode: string | null,
): StatRealmUserStats {
  const totalPlaytimeMinutes = libraryGames.reduce(
    (total, game) => total + game.playtimeMinutes,
    0,
  );
  const achievementCompletionRate =
    achievementSummary.totalsStatus === "complete" &&
    achievementSummary.totalAvailable !== null &&
    achievementSummary.totalAvailable > 0 &&
    achievementSummary.totalUnlocked !== null
      ? (achievementSummary.totalUnlocked / achievementSummary.totalAvailable) *
        100
      : null;

  return {
    totalPlaytimeMinutes,
    totalGames: gameCount,
    totalUnlockedAchievements: achievementSummary.totalUnlocked,
    totalAvailableAchievements: achievementSummary.totalAvailable,
    achievementCompletionRate,
    perfectGames: achievementSummary.perfectGames,
    averageAchievementRarity: achievementSummary.averageAchievementRarity,
    achievementTotalsStatus: achievementSummary.totalsStatus,
    achievementRarityStatus: achievementSummary.rarityStatus,
    steamLevel,
    countryCode,
  };
}

function preserveStoredAchievementStats(
  stats: StatRealmUserStats,
  existingStats: StatRealmUserStats | null | undefined,
  achievementSummary: Awaited<ReturnType<typeof getAchievementLibrarySummary>>,
): StatRealmUserStats {
  if (
    achievementSummary.totalsStatus === "complete" ||
    existingStats?.achievementTotalsStatus !== "complete"
  ) {
    return stats;
  }

  return {
    ...stats,
    totalUnlockedAchievements: existingStats.totalUnlockedAchievements,
    totalAvailableAchievements: existingStats.totalAvailableAchievements,
    achievementCompletionRate: existingStats.achievementCompletionRate,
    perfectGames: existingStats.perfectGames,
    averageAchievementRarity: existingStats.averageAchievementRarity,
    achievementTotalsStatus: existingStats.achievementTotalsStatus,
    achievementRarityStatus: existingStats.achievementRarityStatus,
  };
}

export async function syncUserSteamLibrary(
  steamId: string,
  options?: {
    games?: SteamOwnedGame[];
    profile?: SteamProfile | null;
    gameCount?: number;
    forceAchievementRefresh?: boolean;
    recordLogin?: boolean;
  },
) {
  let ownedLibrary: SteamOwnedGame[];
  let gameCount: number;

  if (options?.games !== undefined) {
    ownedLibrary = options.games;
    gameCount = options.gameCount ?? ownedLibrary.length;
  } else {
    try {
      const ownedLibraryResult = await getOwnedGamesLibrary(steamId);
      ownedLibrary = ownedLibraryResult.games;
      gameCount = ownedLibraryResult.gameCount;
    } catch (error) {
      console.error(
        "[StatRealm] Steam library sync failed: could not fetch owned games",
        { steamId, error },
      );
      throw error;
    }
  }

  const [profile, steamLevel, storedAchievementHistory, storedLibrary] =
    await Promise.all([
    options?.profile === undefined
      ? getAuthenticatedSteamProfile(steamId)
      : Promise.resolve(options.profile),
    getSteamLevel(steamId).catch(() => null),
    getUserAchievementHistory(steamId),
    getUserLibrary(steamId),
  ]);
  const existingUser = await getStatRealmUser(steamId);
  const storedContext = {
    storedLibrary,
    storedHistory: storedAchievementHistory,
    storedStats: existingUser?.stats ?? null,
    lastSyncedAt: existingUser?.lastSyncedAt ?? null,
  };
  const forceAchievementRefresh =
    options?.forceAchievementRefresh === true ||
    shouldRefreshAchievementHistory(
      steamId,
      storedAchievementHistory.length,
      existingUser?.lastSyncedAt,
    );
  const achievementSummary = await getAchievementLibrarySummary(
    steamId,
    ownedLibrary,
    {
      forceRefresh: forceAchievementRefresh,
      storedContext,
    },
  );
  const storedLibraryByAppId = new Map(
    storedLibrary.map((game) => [game.appId, game]),
  );
  const libraryGames = await resolveLibraryGameNames(
    toUserLibraryGames(ownedLibrary, achievementSummary, storedLibraryByAppId),
    steamId,
  );
  const stats = preserveStoredAchievementStats(
    buildSyncedUserStats(
      libraryGames,
      gameCount,
      achievementSummary,
      steamLevel,
      profile?.loccountrycode ?? null,
    ),
    existingUser?.stats,
    achievementSummary,
  );
  const profileFields = profile ? steamProfileToStoredFields(profile) : null;
  const achievementHistory = buildSyncSnapshotAchievementHistory(
    achievementSummary,
  );

  await commitUserSyncSnapshot(steamId, {
    user: {
      steamId,
      displayName:
        profileFields?.displayName ?? existingUser?.displayName ?? "",
      avatar: profileFields?.avatar ?? existingUser?.avatar ?? "",
      avatarMedium:
        profileFields?.avatarMedium ?? existingUser?.avatarMedium ?? "",
      avatarUrl: profileFields?.avatarUrl ?? existingUser?.avatarUrl ?? "",
      profileUrl:
        profileFields?.profileUrl ??
        existingUser?.profileUrl ??
        `https://steamcommunity.com/profiles/${steamId}`,
      stats: profileFields
        ? {
            ...stats,
            countryCode: profileFields.countryCode,
          }
        : stats ?? createEmptyUserStats(),
    },
    library: libraryGames,
    achievementHistory,
    profileAnalytics: buildSyncSnapshotProfileAnalytics(achievementSummary),
    replaceAchievementHistory: achievementSummary.historySyncCompleted,
    recordLogin: options?.recordLogin === true,
  });

  return {
    stats,
    libraryGames,
    achievementSummary,
  };
}
