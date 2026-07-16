import "server-only";

import type { SteamOwnedGame } from "@/lib/steam/api";
import {
  fetchStoreAppData,
  getCachedStoreAppGenres,
  parseStoreAppGenres,
} from "@/lib/steam/store-app-cache";
import type { GenrePlaytime } from "@/types/dashboard";

const REQUEST_DELAY_MS = 500;
const GENRE_BATCH_SIZE = 6;
const MAX_ATTEMPTS = 3;

type GenreSyncResult =
  | { status: "complete"; genres: GenrePlaytime[] }
  | { status: "unavailable"; genres: GenrePlaytime[] };

type AppGenreResult =
  | {
      status: "complete";
      genres: string[];
      source: "cache" | "api";
      httpStatus: number;
    }
  | {
      status: "unavailable";
      genres: [];
      source: "api";
      httpStatus?: number;
      reason: string;
    };

const genreCache = new Map<string, GenreSyncResult>();
const inFlightSyncs = new Map<string, Promise<GenreSyncResult>>();
const globalGenreState = globalThis as typeof globalThis & {
  statRealmAppGenreCache?: Map<number, string[]>;
};
const appGenreCache =
  globalGenreState.statRealmAppGenreCache ?? new Map<number, string[]>();
globalGenreState.statRealmAppGenreCache = appGenreCache;

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours.toLocaleString()}h ${remainingMinutes}m`;
}

async function fetchGenres(appId: number): Promise<AppGenreResult> {
  const cachedGenres = getCachedStoreAppGenres(appId) ?? appGenreCache.get(appId);
  if (cachedGenres) {
    appGenreCache.set(appId, cachedGenres);
    return {
      status: "complete",
      genres: cachedGenres,
      source: "cache",
      httpStatus: 200,
    };
  }

  let lastReason = "Steam Store metadata was unavailable.";

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      const storeApp = await fetchStoreAppData(appId);

      if (!storeApp.success || !storeApp.data) {
        return {
          status: "unavailable",
          genres: [],
          source: "api",
          reason: "Steam Store returned an unsuccessful app response.",
        };
      }

      const genres = parseStoreAppGenres(storeApp.data);
      appGenreCache.set(appId, genres);
      return {
        status: "complete",
        genres,
        source: storeApp.source,
        httpStatus: 200,
      };
    } catch {
      if (attempt + 1 < MAX_ATTEMPTS) {
        await sleep(500 * 2 ** attempt);
      }
    }
  }

  return {
    status: "unavailable",
    genres: [],
    source: "api",
    reason: lastReason,
  };
}

function buildGenrePlaytimeFromCache(games: SteamOwnedGame[]) {
  const genreMinutes = new Map<string, number>();
  let totalPlaytimeMinutes = 0;

  for (const game of games) {
    const appId = Number(game.appid);
    const cachedGenres = appGenreCache.get(appId);
    const playtime = Number(game.playtime_forever);

    if (
      !cachedGenres ||
      cachedGenres.length === 0 ||
      !Number.isFinite(playtime) ||
      playtime <= 0
    ) {
      continue;
    }

    totalPlaytimeMinutes += playtime;

    for (const genre of new Set(cachedGenres)) {
      genreMinutes.set(genre, (genreMinutes.get(genre) ?? 0) + playtime);
    }
  }

  const genres = Array.from(genreMinutes, ([genre, minutes]) => ({
    genre,
    hours: formatMinutes(minutes),
    percentage:
      totalPlaytimeMinutes > 0
        ? (minutes / totalPlaytimeMinutes) * 100
        : 0,
  }))
    .sort((first, second) => {
      const firstMinutes = genreMinutes.get(first.genre) ?? 0;
      const secondMinutes = genreMinutes.get(second.genre) ?? 0;
      return secondMinutes - firstMinutes;
    })
    .slice(0, 5);

  return { genres, totalPlaytimeMinutes };
}

async function synchronizeGenres(games: SteamOwnedGame[]) {
  const ownedGames = games.filter(
    (game) =>
      Number.isInteger(Number(game.appid)) &&
      Number(game.appid) > 0,
  );
  const playedGames = ownedGames.filter(
    (game) => Number(game.playtime_forever) > 0,
  );
  const results: Array<{
    game: SteamOwnedGame;
    status: "complete" | "unavailable";
    genres: string[];
    source: "cache" | "api";
    httpStatus?: number;
    reason?: string;
  }> = [];

  for (let index = 0; index < playedGames.length; index += GENRE_BATCH_SIZE) {
    const batch = playedGames.slice(index, index + GENRE_BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (game) => {
        const result = await fetchGenres(Number(game.appid));
        return { game, ...result };
      }),
    );
    results.push(...batchResults);

    const hadUncachedApiHits = batchResults.some(
      (result) => result.source === "api",
    );

    if (
      hadUncachedApiHits &&
      index + GENRE_BATCH_SIZE < playedGames.length
    ) {
      await sleep(REQUEST_DELAY_MS);
    }
  }

  const unavailableGames = results.filter(
    (result) => result.status === "unavailable",
  );
  const gamesWithGenreMetadata = ownedGames.filter((game) => {
    const genres = appGenreCache.get(Number(game.appid));
    return genres !== undefined && genres.length > 0;
  });
  const gamesMissingGenreMetadata = ownedGames.filter((game) => {
    const genres = appGenreCache.get(Number(game.appid));
    return genres === undefined || genres.length === 0;
  });
  const storeApiSucceeded = results.filter(
    (result) =>
      result.status === "complete" && result.source === "api",
  ).length;
  const storeApiFailed = results.filter(
    (result) => result.status === "unavailable",
  ).length;
  const rateLimitedRequests = results.filter(
    (result) => result.httpStatus === 429,
  ).length;
  const { genres, totalPlaytimeMinutes } =
    buildGenrePlaytimeFromCache(ownedGames);

  console.info("[Steam Genre Sync] Diagnostics", {
    totalOwnedGames: ownedGames.length,
    playedGames: playedGames.length,
    gamesWithGenreMetadata: gamesWithGenreMetadata.length,
    gamesMissingGenreMetadata: gamesMissingGenreMetadata.length,
    playedGamesMissingGenreMetadata: unavailableGames.length,
    storeApiRequests: {
      succeeded: storeApiSucceeded,
      servedFromCache: results.filter(
        (result) => result.source === "cache",
      ).length,
      failed: storeApiFailed,
      rateLimited: rateLimitedRequests,
      succeeding: storeApiFailed === 0,
    },
  });

  if (unavailableGames.length > 0) {
    console.warn("[Steam Genre Sync] Incomplete Store metadata", {
      unavailableGames: unavailableGames.map((result) => ({
        appId: result.game.appid,
        name: result.game.name,
        httpStatus: result.httpStatus,
        reason: result.reason,
      })),
    });
  }

  if (genres.length === 0) {
    console.warn("[Steam Genre Sync] No genre playtime available", {
      playedGames: playedGames.length,
      storeApiFailed,
      rateLimitedRequests,
    });
    return { status: "unavailable" as const, genres: [] };
  }

  console.info("[Steam Genre Sync] Complete", {
    ownedGames: ownedGames.length,
    mappedPlaytimeMinutes: totalPlaytimeMinutes,
    genres: genres.map((genre) => ({
      genre: genre.genre,
      hours: genre.hours,
      percentage: Number(genre.percentage.toFixed(1)),
    })),
  });

  return { status: "complete" as const, genres };
}

export async function getGenrePlaytimeSummary(
  steamId: string,
  games: SteamOwnedGame[],
  syncVersion: string,
) {
  const cacheKey = `${steamId}:${syncVersion}`;
  const cached = genreCache.get(cacheKey);
  if (cached?.status === "complete") {
    const gamesWithGenreMetadata = games.filter((game) => {
      const genres = appGenreCache.get(Number(game.appid));
      return genres !== undefined && genres.length > 0;
    }).length;
    console.info("[Steam Genre Sync] Diagnostics", {
      totalOwnedGames: games.length,
      gamesWithGenreMetadata,
      gamesMissingGenreMetadata:
        games.length - gamesWithGenreMetadata,
      playedGamesMissingGenreMetadata: 0,
      storeApiRequests: {
        succeeded: 0,
        servedFromCache: gamesWithGenreMetadata,
        failed: 0,
        rateLimited: 0,
        succeeding: true,
      },
    });
    return cached;
  }
  if (cached) genreCache.delete(cacheKey);

  const existingSync = inFlightSyncs.get(cacheKey);
  if (existingSync) return existingSync;

  const sync = synchronizeGenres(games)
    .then((result) => {
      if (result.status === "complete") {
        genreCache.set(cacheKey, result);
      }
      return result;
    })
    .finally(() => {
      inFlightSyncs.delete(cacheKey);
    });

  inFlightSyncs.set(cacheKey, sync);
  return sync;
}

export function invalidateGenreCache(steamId: string) {
  const keyPrefix = `${steamId}:`;

  for (const cacheKey of genreCache.keys()) {
    if (cacheKey.startsWith(keyPrefix)) {
      genreCache.delete(cacheKey);
    }
  }
}
