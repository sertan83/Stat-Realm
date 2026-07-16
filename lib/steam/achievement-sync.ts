import "server-only";

import {
  fetchAchievementProgressResult,
  fetchAchievementSchemaResult,
  fetchGlobalAchievementPercentagesResult,
  type SteamAchievementProgressResult,
  type SteamAchievementSchemaResult,
  type SteamGlobalPercentagesResult,
  type SteamOwnedGame,
} from "@/lib/steam/api";

const BATCH_SIZE = 12;
const BATCH_DELAY_MS = 120;
const MAX_ATTEMPTS = 3;

export type SteamAchievementLibrarySummary = {
  totalsStatus: "complete" | "unavailable";
  rarityStatus: "complete" | "unavailable";
  totalUnlocked: number | null;
  totalAvailable: number | null;
  perfectGames: number | null;
  averageAchievementRarity: number | null;
  progressByAppId: Map<
    number,
    Extract<SteamAchievementProgressResult, { status: "complete" }>["progress"]
  >;
  achievementStatusByAppId: Map<
    number,
    SteamAchievementProgressResult["status"]
  >;
  unlockedAchievementHistory: SteamUnlockedAchievement[];
  historySyncCompleted: boolean;
};

export type AchievementLibrarySyncOptions = {
  forceRefresh?: boolean;
};

const ACHIEVEMENT_HISTORY_MAX_AGE_MS = 30 * 60 * 1000;

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

async function retryGlobalPercentages(
  appId: number,
): Promise<SteamGlobalPercentagesResult> {
  let result: SteamGlobalPercentagesResult = { status: "unavailable" };

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    result = await fetchGlobalAchievementPercentagesResult(appId);
    if (result.status === "complete") return result;
    if (attempt + 1 < MAX_ATTEMPTS) await sleep(500 * 2 ** attempt);
  }

  return result;
}

async function retrySchema(
  appId: number,
): Promise<SteamAchievementSchemaResult> {
  let result: SteamAchievementSchemaResult = { status: "unavailable" };

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    result = await fetchAchievementSchemaResult(appId);
    if (result.status === "complete") return result;
    if (attempt + 1 < MAX_ATTEMPTS) await sleep(500 * 2 ** attempt);
  }

  return result;
}

function unavailableSummary(
  progressByAppId = new Map<
    number,
    Extract<SteamAchievementProgressResult, { status: "complete" }>["progress"]
  >(),
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

function logGameDiagnostics(
  games: SteamOwnedGame[],
  resultsByAppId: Map<number, SteamAchievementProgressResult>,
) {
  if (process.env.NODE_ENV === "production") return;

  for (const game of games) {
    const appId = Number(game.appid);
    const result = resultsByAppId.get(appId);
    const supportsAchievements =
      game.has_community_visible_stats === true &&
      result?.status !== "unsupported";
    const progress =
      result?.status === "complete" ? result.progress : null;
    const completion =
      progress && progress.total > 0
        ? `${((progress.unlocked / progress.total) * 100).toFixed(1)}%`
        : result?.status === "unavailable"
          ? "Sync failed"
          : "N/A";

    console.info(
      [
        "[Steam Achievement Sync]",
        `Game: ${game.name ?? `Steam App ${game.appid}`}`,
        `Supports achievements: ${supportsAchievements ? "Yes" : "No"}`,
        `Unlocked: ${progress?.unlocked ?? "N/A"}`,
        `Total: ${progress?.total ?? "N/A"}`,
        `Completion: ${completion}`,
      ].join("\n"),
    );
  }
}

function logCompletionDiagnostics(
  games: SteamOwnedGame[],
  summary: SteamAchievementLibrarySummary,
) {
  const synchronizedGames = Array.from(
    summary.progressByAppId.values(),
  );
  const gamesWithAchievements = synchronizedGames.filter(
    (progress) => progress.total > 0,
  );

  console.info("[Steam Completion Sync] Diagnostics", {
    totalGames: games.length,
    gamesWithAchievements: gamesWithAchievements.length,
    gamesSynchronized: synchronizedGames.length,
    completedGames: gamesWithAchievements.filter(
      (progress) => progress.unlocked === progress.total,
    ).length,
    inProgressGames: gamesWithAchievements.filter(
      (progress) =>
        progress.unlocked > 0 &&
        progress.unlocked < progress.total,
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
): Promise<SteamAchievementLibrarySummary> {
  const achievementGames = games.filter(
    (game) => game.has_community_visible_stats === true,
  );
  const appIds = achievementGames.map((game) => Number(game.appid));

  if (appIds.some((appId) => !Number.isInteger(appId) || appId <= 0)) {
    return unavailableSummary();
  }

  const progressResults = await runInBatches(appIds, async (appId) => ({
    appId,
    result: await retryProgress(steamId, appId),
  }));
  const resultsByAppId = new Map(
    progressResults.map(({ appId, result }) => [appId, result]),
  );
  const completedGames = progressResults.flatMap(({ appId, result }) =>
    result.status === "complete"
      ? [{ appId, progress: result.progress }]
      : [],
  );
  const progressByAppId = new Map(
    completedGames.map((game) => [game.appId, game.progress]),
  );
  const achievementStatusByAppId = new Map(
    games.flatMap((game) => {
      const appId = Number(game.appid);

      if (!Number.isInteger(appId) || appId <= 0) return [];

      return [
        [
          appId,
          resultsByAppId.get(appId)?.status ?? "unsupported",
        ] as const,
      ];
    }),
  );
  const gamesWithAchievements = completedGames.filter(
    (game) => game.progress.total > 0,
  );
  const completedGameCount = gamesWithAchievements.filter(
    (game) => game.progress.unlocked === game.progress.total,
  ).length;
  const inProgressGameCount = gamesWithAchievements.filter(
    (game) =>
      game.progress.unlocked > 0 &&
      game.progress.unlocked < game.progress.total,
  ).length;
  const untouchedGameCount = gamesWithAchievements.filter(
    (game) => game.progress.unlocked === 0,
  ).length;

  console.info("[Steam Completion Sync] Diagnostics", {
    totalGames: games.length,
    gamesWithAchievements: gamesWithAchievements.length,
    gamesSynchronized: completedGames.length,
    completedGames: completedGameCount,
    inProgressGames: inProgressGameCount,
    untouchedGames: untouchedGameCount,
    unavailableGames: progressResults.filter(
      ({ result }) => result.status === "unavailable",
    ).length,
  });

  logGameDiagnostics(games, resultsByAppId);
  const gamesByAppId = new Map(
    games.map((game) => [Number(game.appid), game]),
  );
  const gamesWithTimestampedAchievements = completedGames.filter((game) =>
    game.progress.achievements.some(
      (achievement) =>
        achievement.achieved === 1 &&
        hasValidUnlockTimestamp(achievement.unlocktime),
    ),
  );
  const schemaResults = await runInBatches(
    gamesWithTimestampedAchievements,
    async (game) => ({
      game,
      result: await retrySchema(game.appId),
    }),
  );
  const unavailableSchemaAppIds = schemaResults
    .filter(({ result }) => result.status === "unavailable")
    .map(({ game }) => game.appId);

  if (unavailableSchemaAppIds.length > 0) {
    console.warn("[Steam Achievement Sync] Incomplete schema data", {
      unavailableAppIds: unavailableSchemaAppIds,
    });
  }

  const unlockedAchievementHistory = schemaResults
    .flatMap(({ game, result }) => {
      if (result.status !== "complete") return [];

      const gameName =
        gamesByAppId.get(game.appId)?.name ?? `Steam App ${game.appId}`;

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
    })
    .sort((first, second) => second.unlockTime - first.unlockTime);

  console.info("[Steam Achievement Sync] History synchronized", {
    unlockedAchievements: unlockedAchievementHistory.length,
    newestUnlockTime: unlockedAchievementHistory[0]?.unlockTime ?? null,
  });

  const unavailableProgressResults = progressResults.filter(
    ({ result }) => result.status === "unavailable",
  );

  if (unavailableProgressResults.length > 0) {
    console.warn("[Steam Achievement Sync] Incomplete player data", {
      ownedGames: games.length,
      achievementGames: appIds.length,
      synchronizedGames: completedGames.length,
      unavailableGames: unavailableProgressResults.map(
        ({ appId, result }) => ({
          appId,
          httpStatus:
            result.status === "unavailable"
              ? result.httpStatus
              : undefined,
          reason:
            result.status === "unavailable" ? result.reason : undefined,
        }),
      ),
    });
  }

  if (completedGames.length === 0) {
    const historySyncCompleted =
      appIds.length > 0 &&
      unavailableProgressResults.length < appIds.length;

    return unavailableSummary(
      progressByAppId,
      achievementStatusByAppId,
      unlockedAchievementHistory,
      historySyncCompleted,
    );
  }

  const totalUnlocked = completedGames.reduce(
    (total, game) => total + game.progress.unlocked,
    0,
  );
  const totalAvailable = completedGames.reduce(
    (total, game) => total + game.progress.total,
    0,
  );
  const perfectGames = completedGames.filter(
    (game) =>
      game.progress.total > 0 &&
      game.progress.unlocked === game.progress.total,
  ).length;
  const gamesWithUnlockedAchievements = completedGames.filter(
    (game) => game.progress.unlocked > 0,
  );
  const globalResults = await runInBatches(
    gamesWithUnlockedAchievements,
    async (game) => ({
      game,
      result: await retryGlobalPercentages(game.appId),
    }),
  );

  if (globalResults.some(({ result }) => result.status === "unavailable")) {
    console.warn("[Steam Achievement Sync] Incomplete global rarity data", {
      unavailableAppIds: globalResults
        .filter(({ result }) => result.status === "unavailable")
        .map(({ game }) => game.appId),
    });
    return {
      totalsStatus: "complete",
      rarityStatus: "unavailable",
      totalUnlocked,
      totalAvailable,
      perfectGames,
      averageAchievementRarity: null,
      progressByAppId,
      achievementStatusByAppId,
      unlockedAchievementHistory,
      historySyncCompleted: true,
    };
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
          totalsStatus: "complete",
          rarityStatus: "unavailable",
          totalUnlocked,
          totalAvailable,
          perfectGames,
          averageAchievementRarity: null,
          progressByAppId,
          achievementStatusByAppId,
          unlockedAchievementHistory,
          historySyncCompleted: true,
        };
      }

      rarityTotal += percentage;
      rarityCount += 1;
    }
  }

  console.info("[Steam Achievement Sync] Complete", {
    ownedGames: games.length,
    achievementGames: completedGames.length,
    totalUnlocked,
    totalAvailable,
    perfectGames,
    unlockedAchievementsWithRarity: rarityCount,
  });

  return {
    totalsStatus: "complete",
    rarityStatus: rarityCount > 0 ? "complete" : "unavailable",
    totalUnlocked,
    totalAvailable,
    perfectGames,
    averageAchievementRarity:
      rarityCount > 0 ? rarityTotal / rarityCount : null,
    progressByAppId,
    achievementStatusByAppId,
    unlockedAchievementHistory,
    historySyncCompleted: true,
  };
}

function getAchievementCacheEntry(steamId: string) {
  return summaryCache.get(steamId) ?? null;
}

export function shouldRefreshAchievementHistory(
  steamId: string,
  storedHistoryCount: number,
) {
  const cached = getAchievementCacheEntry(steamId);

  if (!cached) {
    return true;
  }

  const isOutdated =
    Date.now() - cached.syncedAt > ACHIEVEMENT_HISTORY_MAX_AGE_MS;
  const cachedHistoryMissing =
    cached.summary.unlockedAchievementHistory.length === 0 &&
    storedHistoryCount > 0;

  return isOutdated || cachedHistoryMissing;
}

export async function getAchievementLibrarySummary(
  steamId: string,
  games: SteamOwnedGame[],
  options: AchievementLibrarySyncOptions = {},
) {
  const cached = getAchievementCacheEntry(steamId);

  if (cached && !options.forceRefresh) {
    logCompletionDiagnostics(games, cached.summary);
    return cached.summary;
  }

  const existingSync = inFlightSyncs.get(steamId);
  if (existingSync) {
    return existingSync;
  }

  const sync = synchronizeAchievementLibrary(steamId, games)
    .then((summary) => {
      summaryCache.set(steamId, {
        summary,
        syncedAt: Date.now(),
      });
      logCompletionDiagnostics(games, summary);
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
  inFlightSyncs.delete(steamId);
}
