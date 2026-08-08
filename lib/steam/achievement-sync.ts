import "server-only";

import type {
  StatRealmUserStats,
  StoredUnlockedAchievement,
  UserLibraryGame,
} from "@/lib/db/types";
import { GAME_NAME_LOADING_LABEL } from "@/lib/game-metadata/constants";
import { resolveGameMetadataBatch } from "@/lib/steam/game-metadata";
import {
  fetchAchievementProgressResult,
  fetchAchievementSchemaResult,
  fetchGlobalAchievementPercentagesResult,
  type SteamAchievementProgress,
  type SteamAchievementProgressResult,
  type SteamAchievementSchemaResult,
  type SteamGlobalPercentagesResult,
  type SteamOwnedGame,
} from "@/lib/steam/api";

const BATCH_SIZE = 12;
const BATCH_DELAY_MS = 120;
const MAX_ATTEMPTS = 3;
const MAX_GAMES_PER_SYNC = 48;

const SUMMARY_CACHE_TTL_MS = 30 * 60 * 1000;
const ACHIEVEMENT_HISTORY_MAX_AGE_MS = SUMMARY_CACHE_TTL_MS;
const PROGRESS_RECENT_PLAY_TTL_MS = 6 * 60 * 60 * 1000;
const PROGRESS_DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const PROGRESS_STALE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SCHEMA_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const GLOBAL_PERCENTAGES_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export type SteamAchievementLibrarySummary = {
  totalsStatus: "complete" | "unavailable";
  rarityStatus: "complete" | "unavailable";
  totalUnlocked: number | null;
  totalAvailable: number | null;
  perfectGames: number | null;
  averageAchievementRarity: number | null;
  progressByAppId: Map<number, SteamAchievementProgress>;
  achievementStatusByAppId: Map<
    number,
    SteamAchievementProgressResult["status"]
  >;
  unlockedAchievementHistory: SteamUnlockedAchievement[];
  historySyncCompleted: boolean;
};

export type AchievementLibrarySyncOptions = {
  forceRefresh?: boolean;
  storedContext?: StoredAchievementContext;
};

export type StoredAchievementContext = {
  storedLibrary: UserLibraryGame[];
  storedHistory: StoredUnlockedAchievement[];
  storedStats: StatRealmUserStats | null;
  lastSyncedAt: string | null;
};

export type SteamUnlockedAchievement = {
  id: string;
  appId: number;
  apiName: string;
  name: string;
  gameName: string;
  iconUrl: string;
  unlockTime: number;
};

const summaryCache = new Map<
  string,
  {
    summary: SteamAchievementLibrarySummary;
    syncedAt: number;
  }
>();
const inFlightSyncs = new Map<
  string,
  Promise<SteamAchievementLibrarySummary>
>();
const gameSyncTimestamps = new Map<string, Map<number, number>>();
const schemaCache = new Map<
  number,
  {
    result: Extract<SteamAchievementSchemaResult, { status: "complete" }>;
    syncedAt: number;
  }
>();
const globalPercentagesCache = new Map<
  number,
  {
    result: Extract<SteamGlobalPercentagesResult, { status: "complete" }>;
    syncedAt: number;
  }
>();

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function hasValidUnlockTimestamp(timestamp: number) {
  return (
    Number.isFinite(timestamp) &&
    timestamp > 0 &&
    !Number.isNaN(new Date(timestamp * 1000).getTime())
  );
}

function getGameSyncTimestamps(steamId: string) {
  let timestamps = gameSyncTimestamps.get(steamId);
  if (!timestamps) {
    timestamps = new Map<number, number>();
    gameSyncTimestamps.set(steamId, timestamps);
  }
  return timestamps;
}

function markGamesSynced(steamId: string, appIds: number[]) {
  const timestamps = getGameSyncTimestamps(steamId);
  const now = Date.now();
  for (const appId of appIds) {
    timestamps.set(appId, now);
  }
}

function parseLastSyncedAt(lastSyncedAt: string | null | undefined) {
  if (!lastSyncedAt) return null;
  const parsed = new Date(lastSyncedAt).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function storedHistoryToUnlockEntries(
  history: StoredUnlockedAchievement[],
): SteamUnlockedAchievement[] {
  return history.map((entry) => ({
    id: entry.id,
    appId: entry.appId,
    apiName: entry.apiName,
    name: entry.name,
    gameName: entry.gameName,
    iconUrl: entry.iconUrl,
    unlockTime: entry.unlockTime,
  }));
}

function buildStoredProgress(
  storedGame: UserLibraryGame,
): SteamAchievementProgress | null {
  if (storedGame.achievementsTotal === null) {
    return null;
  }

  if (storedGame.achievementsTotal === 0) {
    return {
      unlocked: 0,
      total: 0,
      percentage: 0,
      achievements: [],
    };
  }

  return {
    unlocked: storedGame.achievementsUnlocked ?? 0,
    total: storedGame.achievementsTotal,
    percentage: storedGame.completionPercentage ?? 0,
    achievements: [],
  };
}

function buildSummaryFromStoredContext(
  storedContext: StoredAchievementContext,
  games: SteamOwnedGame[],
): SteamAchievementLibrarySummary {
  const storedByAppId = new Map(
    storedContext.storedLibrary.map((game) => [game.appId, game]),
  );
  const progressByAppId = new Map<number, SteamAchievementProgress>();
  const achievementStatusByAppId = new Map<
    number,
    SteamAchievementProgressResult["status"]
  >();

  for (const game of games) {
    const appId = Number(game.appid);
    if (!Number.isInteger(appId) || appId <= 0) continue;

    const storedGame = storedByAppId.get(appId);
    const storedProgress = storedGame ? buildStoredProgress(storedGame) : null;

    if (!storedGame || storedGame.achievementsTotal === null) {
      achievementStatusByAppId.set(
        appId,
        game.has_community_visible_stats === true ? "unavailable" : "unsupported",
      );
      continue;
    }

    if (storedGame.achievementsTotal === 0) {
      achievementStatusByAppId.set(appId, "unsupported");
      progressByAppId.set(appId, {
        unlocked: 0,
        total: 0,
        percentage: 0,
        achievements: [],
      });
      continue;
    }

    if (storedProgress) {
      progressByAppId.set(appId, storedProgress);
      achievementStatusByAppId.set(appId, "complete");
    }
  }

  const stats = storedContext.storedStats;
  const unlockedAchievementHistory = storedHistoryToUnlockEntries(
    storedContext.storedHistory,
  );

  return {
    totalsStatus: stats?.achievementTotalsStatus ?? "unavailable",
    rarityStatus: stats?.achievementRarityStatus ?? "unavailable",
    totalUnlocked: stats?.totalUnlockedAchievements ?? null,
    totalAvailable: stats?.totalAvailableAchievements ?? null,
    perfectGames: stats?.perfectGames ?? null,
    averageAchievementRarity: stats?.averageAchievementRarity ?? null,
    progressByAppId,
    achievementStatusByAppId,
    unlockedAchievementHistory,
    historySyncCompleted: storedContext.storedHistory.length > 0,
  };
}

function canUseStoredSummaryWithoutSync(
  storedContext: StoredAchievementContext,
) {
  if (storedContext.storedLibrary.length === 0) {
    return false;
  }

  const lastSyncedMs = parseLastSyncedAt(storedContext.lastSyncedAt);
  if (lastSyncedMs === null) {
    return false;
  }

  if (Date.now() - lastSyncedMs > SUMMARY_CACHE_TTL_MS) {
    return false;
  }

  const hasAchievementData = storedContext.storedLibrary.some(
    (game) => game.achievementsTotal !== null,
  );

  return hasAchievementData;
}

function shouldRefreshGameProgress(
  game: SteamOwnedGame,
  storedGame: UserLibraryGame | undefined,
  gameLastSyncedAt: number | null,
  globalLastSyncedAt: number | null,
) {
  if (game.has_community_visible_stats !== true) {
    return false;
  }

  const lastSync = gameLastSyncedAt ?? globalLastSyncedAt;
  if (lastSync === null || !storedGame || storedGame.achievementsTotal === null) {
    return true;
  }

  const syncAge = Date.now() - lastSync;

  if (
    storedGame.perfectGame === true &&
    (game.playtime_2weeks ?? 0) === 0 &&
    syncAge <= PROGRESS_STALE_TTL_MS
  ) {
    return false;
  }

  if ((game.playtime_2weeks ?? 0) > 0) {
    return syncAge > PROGRESS_RECENT_PLAY_TTL_MS;
  }

  if (
    storedGame.achievementsTotal !== null &&
    storedGame.achievementsTotal > 0 &&
    storedGame.perfectGame !== true
  ) {
    return syncAge > PROGRESS_DEFAULT_TTL_MS;
  }

  if ((storedGame.achievementsUnlocked ?? 0) === 0) {
    return syncAge > PROGRESS_STALE_TTL_MS;
  }

  return syncAge > PROGRESS_DEFAULT_TTL_MS;
}

function selectGamesToRefresh(
  steamId: string,
  games: SteamOwnedGame[],
  storedByAppId: Map<number, UserLibraryGame>,
  globalLastSyncedAt: number | null,
) {
  const timestamps = getGameSyncTimestamps(steamId);
  const candidates = games
    .filter((game) => game.has_community_visible_stats === true)
    .map((game) => {
      const appId = Number(game.appid);
      const storedGame = storedByAppId.get(appId);
      const gameLastSyncedAt = timestamps.get(appId) ?? null;
      const needsRefresh = shouldRefreshGameProgress(
        game,
        storedGame,
        gameLastSyncedAt,
        globalLastSyncedAt,
      );
      const priority =
        storedGame?.achievementsTotal === null
          ? 0
          : (game.playtime_2weeks ?? 0) > 0
            ? 1
            : storedGame?.perfectGame === true
              ? 4
              : (storedGame?.achievementsUnlocked ?? 0) > 0
                ? 2
                : 3;

      return { game, appId, needsRefresh, priority };
    })
    .filter((entry) => entry.needsRefresh)
    .sort((first, second) => first.priority - second.priority);

  return candidates.slice(0, MAX_GAMES_PER_SYNC).map((entry) => entry.game);
}

async function runInBatches<T, R>(
  items: T[],
  worker: (item: T) => Promise<R>,
) {
  const results: R[] = [];

  for (let index = 0; index < items.length; index += BATCH_SIZE) {
    const batch = items.slice(index, index + BATCH_SIZE);
    results.push(...(await Promise.all(batch.map(worker))));

    if (index + BATCH_SIZE < items.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  return results;
}

async function retryProgress(
  steamId: string,
  appId: number,
): Promise<SteamAchievementProgressResult> {
  let result: SteamAchievementProgressResult = { status: "unavailable" };

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    result = await fetchAchievementProgressResult(steamId, appId);
    if (result.status !== "unavailable") return result;
    if (
      result.httpStatus !== undefined &&
      result.httpStatus !== 429 &&
      result.httpStatus < 500
    ) {
      return result;
    }
    if (attempt + 1 < MAX_ATTEMPTS) await sleep(500 * 2 ** attempt);
  }

  return result;
}

async function getCachedGlobalPercentages(
  appId: number,
): Promise<SteamGlobalPercentagesResult> {
  const cached = globalPercentagesCache.get(appId);
  if (
    cached &&
    Date.now() - cached.syncedAt <= GLOBAL_PERCENTAGES_CACHE_TTL_MS
  ) {
    return cached.result;
  }

  const result = await fetchGlobalAchievementPercentagesResult(appId);
  if (result.status === "complete") {
    globalPercentagesCache.set(appId, {
      result,
      syncedAt: Date.now(),
    });
  }

  return result;
}

async function getCachedSchema(
  appId: number,
): Promise<SteamAchievementSchemaResult> {
  const cached = schemaCache.get(appId);
  if (cached && Date.now() - cached.syncedAt <= SCHEMA_CACHE_TTL_MS) {
    return cached.result;
  }

  let result: SteamAchievementSchemaResult = { status: "unavailable" };

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    result = await fetchAchievementSchemaResult(appId);
    if (result.status === "complete") {
      schemaCache.set(appId, {
        result,
        syncedAt: Date.now(),
      });
      return result;
    }
    if (result.status === "empty") {
      return result;
    }
    if (attempt + 1 < MAX_ATTEMPTS) await sleep(500 * 2 ** attempt);
  }

  return result;
}

function unavailableSummary(
  progressByAppId = new Map<number, SteamAchievementProgress>(),
  achievementStatusByAppId = new Map<
    number,
    SteamAchievementProgressResult["status"]
  >(),
  unlockedAchievementHistory: SteamUnlockedAchievement[] = [],
  historySyncCompleted = false,
): SteamAchievementLibrarySummary {
  return {
    totalsStatus: "unavailable",
    rarityStatus: "unavailable",
    totalUnlocked: null,
    totalAvailable: null,
    perfectGames: null,
    averageAchievementRarity: null,
    progressByAppId,
    achievementStatusByAppId,
    unlockedAchievementHistory,
    historySyncCompleted,
  };
}

function seedBaselineFromStored(
  games: SteamOwnedGame[],
  storedByAppId: Map<number, UserLibraryGame>,
) {
  const progressByAppId = new Map<number, SteamAchievementProgress>();
  const achievementStatusByAppId = new Map<
    number,
    SteamAchievementProgressResult["status"]
  >();

  for (const game of games) {
    const appId = Number(game.appid);
    if (!Number.isInteger(appId) || appId <= 0) continue;

    const storedGame = storedByAppId.get(appId);
    const storedProgress = storedGame ? buildStoredProgress(storedGame) : null;

    if (!storedGame || storedGame.achievementsTotal === null) {
      achievementStatusByAppId.set(
        appId,
        game.has_community_visible_stats === true ? "unavailable" : "unsupported",
      );
      continue;
    }

    if (storedGame.achievementsTotal === 0) {
      achievementStatusByAppId.set(appId, "unsupported");
      progressByAppId.set(appId, {
        unlocked: 0,
        total: 0,
        percentage: 0,
        achievements: [],
      });
      continue;
    }

    if (storedProgress) {
      progressByAppId.set(appId, storedProgress);
      achievementStatusByAppId.set(appId, "complete");
    }
  }

  return { progressByAppId, achievementStatusByAppId };
}

function mergeProgressResult(
  appId: number,
  result: SteamAchievementProgressResult,
  progressByAppId: Map<number, SteamAchievementProgress>,
  achievementStatusByAppId: Map<number, SteamAchievementProgressResult["status"]>,
  storedGame: UserLibraryGame | undefined,
) {
  achievementStatusByAppId.set(appId, result.status);

  if (result.status === "complete") {
    progressByAppId.set(appId, result.progress);
    return;
  }

  if (result.status === "unavailable" && storedGame) {
    const storedProgress = buildStoredProgress(storedGame);
    if (storedProgress) {
      progressByAppId.set(appId, storedProgress);
      achievementStatusByAppId.set(appId, "complete");
    }
  }
}

function computeTotals(progressByAppId: Map<number, SteamAchievementProgress>) {
  const completedGames = Array.from(progressByAppId.values()).filter(
    (progress) => progress.total > 0,
  );

  if (completedGames.length === 0) {
    return null;
  }

  const totalUnlocked = completedGames.reduce(
    (total, progress) => total + progress.unlocked,
    0,
  );
  const totalAvailable = completedGames.reduce(
    (total, progress) => total + progress.total,
    0,
  );
  const perfectGames = completedGames.filter(
    (progress) => progress.unlocked === progress.total,
  ).length;

  return {
    totalUnlocked,
    totalAvailable,
    perfectGames,
  };
}

function gameNeedsSchemaRefresh(
  appId: number,
  progress: SteamAchievementProgress,
  storedGame: UserLibraryGame | undefined,
  storedHistory: StoredUnlockedAchievement[],
) {
  if (
    !progress.achievements.some(
      (achievement) =>
        achievement.achieved === 1 &&
        hasValidUnlockTimestamp(achievement.unlocktime),
    )
  ) {
    return false;
  }

  const previousUnlocked = storedGame?.achievementsUnlocked ?? 0;
  if (progress.unlocked > previousUnlocked) {
    return true;
  }

  return !storedHistory.some((entry) => entry.appId === appId);
}

async function buildHistoryEntries(
  steamId: string,
  games: SteamOwnedGame[],
  refreshedGames: Array<{ appId: number; progress: SteamAchievementProgress }>,
  storedByAppId: Map<number, UserLibraryGame>,
  storedHistory: StoredUnlockedAchievement[],
) {
  const gamesByAppId = new Map(games.map((game) => [Number(game.appid), game]));
  const gamesNeedingSchema = refreshedGames.filter(({ appId, progress }) =>
    gameNeedsSchemaRefresh(
      appId,
      progress,
      storedByAppId.get(appId),
      storedHistory,
    ),
  );

  if (gamesNeedingSchema.length === 0) {
    return storedHistoryToUnlockEntries(storedHistory);
  }

  const schemaResults = await runInBatches(gamesNeedingSchema, async (game) => ({
    game,
    result: await getCachedSchema(game.appId),
  }));

  const newEntries = schemaResults.flatMap(({ game, result }) => {
    if (result.status !== "complete") return [];

    const ownedGame = gamesByAppId.get(game.appId);
    const gameName = ownedGame?.name?.trim() || "";

    return game.progress.achievements.flatMap((achievement) => {
      if (
        achievement.achieved !== 1 ||
        !hasValidUnlockTimestamp(achievement.unlocktime)
      ) {
        return [];
      }

      const schemaAchievement = result.achievements.get(
        achievement.apiname.toLocaleLowerCase(),
      );

      if (!schemaAchievement) return [];

      return [
        {
          id: `${game.appId}-${achievement.apiname}`,
          appId: game.appId,
          apiName: achievement.apiname,
          name: schemaAchievement.name,
          gameName,
          iconUrl: schemaAchievement.iconUrl,
          unlockTime: achievement.unlocktime,
        },
      ];
    });
  });

  const historyById = new Map<string, SteamUnlockedAchievement>();
  for (const entry of storedHistoryToUnlockEntries(storedHistory)) {
    historyById.set(entry.id, entry);
  }
  for (const entry of newEntries) {
    historyById.set(entry.id, entry);
  }

  const mergedHistory = [...historyById.values()].sort(
    (first, second) => second.unlockTime - first.unlockTime,
  );

  const historyAppIds = [
    ...new Set(mergedHistory.map((entry) => entry.appId)),
  ];
  const resolvedNames = await resolveGameMetadataBatch(historyAppIds, {
    steamId,
  });

  return mergedHistory.map((entry) => ({
    ...entry,
    gameName:
      entry.gameName.trim() ||
      resolvedNames.get(entry.appId) ||
      GAME_NAME_LOADING_LABEL,
  }));
}

async function computeAverageRarity(
  completedGames: Array<{ appId: number; progress: SteamAchievementProgress }>,
) {
  const globalResults = await runInBatches(completedGames, async (game) => ({
    game,
    result: await getCachedGlobalPercentages(game.appId),
  }));

  if (globalResults.some(({ result }) => result.status === "unavailable")) {
    return { rarityStatus: "unavailable" as const, averageAchievementRarity: null };
  }

  let rarityTotal = 0;
  let rarityCount = 0;

  for (const { game, result } of globalResults) {
    if (result.status !== "complete") continue;

    for (const achievement of game.progress.achievements) {
      if (achievement.achieved !== 1) continue;

      const percentage = result.percentages.get(
        achievement.apiname.toLocaleLowerCase(),
      );

      if (percentage === undefined) {
        return {
          rarityStatus: "unavailable" as const,
          averageAchievementRarity: null,
        };
      }

      rarityTotal += percentage;
      rarityCount += 1;
    }
  }

  return {
    rarityStatus:
      rarityCount > 0 ? ("complete" as const) : ("unavailable" as const),
    averageAchievementRarity:
      rarityCount > 0 ? rarityTotal / rarityCount : null,
  };
}

function logCompletionDiagnostics(
  games: SteamOwnedGame[],
  summary: SteamAchievementLibrarySummary,
  refreshedCount: number,
) {
  const synchronizedGames = Array.from(summary.progressByAppId.values());
  const gamesWithAchievements = synchronizedGames.filter(
    (progress) => progress.total > 0,
  );

  console.info("[Steam Completion Sync] Diagnostics", {
    totalGames: games.length,
    gamesWithAchievements: gamesWithAchievements.length,
    gamesSynchronized: synchronizedGames.length,
    refreshedThisSync: refreshedCount,
    completedGames: gamesWithAchievements.filter(
      (progress) => progress.unlocked === progress.total,
    ).length,
    inProgressGames: gamesWithAchievements.filter(
      (progress) =>
        progress.unlocked > 0 && progress.unlocked < progress.total,
    ).length,
    untouchedGames: gamesWithAchievements.filter(
      (progress) => progress.unlocked === 0,
    ).length,
    unavailableGames: Array.from(
      summary.achievementStatusByAppId.values(),
    ).filter((status) => status === "unavailable").length,
  });
}

async function synchronizeAchievementLibrary(
  steamId: string,
  games: SteamOwnedGame[],
  storedContext?: StoredAchievementContext,
): Promise<SteamAchievementLibrarySummary> {
  const storedByAppId = new Map(
    (storedContext?.storedLibrary ?? []).map((game) => [game.appId, game]),
  );
  const storedHistory = storedContext?.storedHistory ?? [];
  const globalLastSyncedAt = parseLastSyncedAt(storedContext?.lastSyncedAt ?? null);
  const { progressByAppId, achievementStatusByAppId } = seedBaselineFromStored(
    games,
    storedByAppId,
  );

  const gamesToRefresh = selectGamesToRefresh(
    steamId,
    games,
    storedByAppId,
    globalLastSyncedAt,
  );

  if (gamesToRefresh.length === 0) {
    const baselineSummary = buildSummaryFromStoredContext(
      storedContext ?? {
        storedLibrary: [],
        storedHistory,
        storedStats: null,
        lastSyncedAt: null,
      },
      games,
    );

    if (baselineSummary.progressByAppId.size > 0) {
      logCompletionDiagnostics(games, baselineSummary, 0);
      return baselineSummary;
    }
  }

  const refreshedAppIds = gamesToRefresh.map((game) => Number(game.appid));
  const progressResults = await runInBatches(refreshedAppIds, async (appId) => ({
    appId,
    result: await retryProgress(steamId, appId),
  }));

  for (const { appId, result } of progressResults) {
    mergeProgressResult(
      appId,
      result,
      progressByAppId,
      achievementStatusByAppId,
      storedByAppId.get(appId),
    );
  }

  markGamesSynced(steamId, refreshedAppIds);

  const refreshedGames = progressResults.flatMap(({ appId, result }) =>
    result.status === "complete" ? [{ appId, progress: result.progress }] : [],
  );
  const totals = computeTotals(progressByAppId);

  if (!totals) {
    const storedSummary =
      storedContext && storedContext.storedLibrary.length > 0
        ? buildSummaryFromStoredContext(storedContext, games)
        : unavailableSummary(
            progressByAppId,
            achievementStatusByAppId,
            storedHistoryToUnlockEntries(storedHistory),
            storedHistory.length > 0,
          );

    logCompletionDiagnostics(games, storedSummary, refreshedAppIds.length);
    return storedSummary;
  }

  const unlockedAchievementHistory = await buildHistoryEntries(
    steamId,
    games,
    refreshedGames,
    storedByAppId,
    storedHistory,
  );

  const gamesWithUnlockedAchievements = Array.from(progressByAppId.entries())
    .filter(([, progress]) => progress.unlocked > 0)
    .map(([appId, progress]) => ({ appId, progress }));

  const { rarityStatus, averageAchievementRarity } =
    storedContext?.storedStats?.achievementRarityStatus === "complete" &&
    storedContext.storedStats.averageAchievementRarity !== null &&
    refreshedGames.length === 0
      ? {
          rarityStatus: "complete" as const,
          averageAchievementRarity:
            storedContext.storedStats.averageAchievementRarity,
        }
      : await computeAverageRarity(gamesWithUnlockedAchievements);

  const summary: SteamAchievementLibrarySummary = {
    totalsStatus: "complete",
    rarityStatus,
    totalUnlocked: totals.totalUnlocked,
    totalAvailable: totals.totalAvailable,
    perfectGames: totals.perfectGames,
    averageAchievementRarity,
    progressByAppId,
    achievementStatusByAppId,
    unlockedAchievementHistory,
    historySyncCompleted:
      storedHistory.length > 0 || unlockedAchievementHistory.length > 0,
  };

  logCompletionDiagnostics(games, summary, refreshedAppIds.length);
  console.info("[Steam Achievement Sync] Incremental sync complete", {
    ownedGames: games.length,
    refreshedGames: refreshedAppIds.length,
    totalUnlocked: totals.totalUnlocked,
    totalAvailable: totals.totalAvailable,
    historyEntries: unlockedAchievementHistory.length,
  });

  return summary;
}

function getAchievementCacheEntry(steamId: string) {
  return summaryCache.get(steamId) ?? null;
}

export function shouldRefreshAchievementHistory(
  steamId: string,
  storedHistoryCount: number,
  lastSyncedAt?: string | null,
) {
  if (storedHistoryCount > 0) {
    const lastSyncedMs = parseLastSyncedAt(lastSyncedAt ?? null);
    if (
      lastSyncedMs !== null &&
      Date.now() - lastSyncedMs <= ACHIEVEMENT_HISTORY_MAX_AGE_MS
    ) {
      return false;
    }
  }

  const cached = getAchievementCacheEntry(steamId);
  if (
    cached &&
    Date.now() - cached.syncedAt <= ACHIEVEMENT_HISTORY_MAX_AGE_MS
  ) {
    return false;
  }

  return storedHistoryCount === 0;
}

export async function getAchievementLibrarySummary(
  steamId: string,
  games: SteamOwnedGame[],
  options: AchievementLibrarySyncOptions = {},
) {
  const storedContext = options.storedContext;

  if (
    !options.forceRefresh &&
    storedContext &&
    canUseStoredSummaryWithoutSync(storedContext)
  ) {
    const summary = buildSummaryFromStoredContext(storedContext, games);
    summaryCache.set(steamId, {
      summary,
      syncedAt: Date.now(),
    });
    logCompletionDiagnostics(games, summary, 0);
    return summary;
  }

  const cached = getAchievementCacheEntry(steamId);
  if (cached && !options.forceRefresh) {
    logCompletionDiagnostics(games, cached.summary, 0);
    return cached.summary;
  }

  const existingSync = inFlightSyncs.get(steamId);
  if (existingSync) {
    return existingSync;
  }

  const sync = synchronizeAchievementLibrary(steamId, games, storedContext)
    .then((summary) => {
      summaryCache.set(steamId, {
        summary,
        syncedAt: Date.now(),
      });
      return summary;
    })
    .finally(() => {
      inFlightSyncs.delete(steamId);
    });

  inFlightSyncs.set(steamId, sync);
  return sync;
}

export function invalidateAchievementLibraryCache(steamId: string) {
  summaryCache.delete(steamId);
  gameSyncTimestamps.delete(steamId);
}
