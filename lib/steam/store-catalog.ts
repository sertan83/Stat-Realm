import "server-only";

import { resolveGameListGamesFromDisplays } from "@/lib/game-display/game-list";
import type { ExploreCatalogQuery } from "@/lib/explore/catalog-params";
import {
  isSteamAppListCached,
  searchSteamAppList,
} from "@/lib/steam/app-list";
import {
  isExcludedAppName,
  isPlayableSteamStoreApp,
} from "@/lib/steam/playable-games";
import { getCachedStoreAppRecord } from "@/lib/steam/store-app-cache";
import type { Game } from "@/types/game";

export type { ExploreCatalogQuery } from "@/lib/explore/catalog-params";
export {
  getExplorePageNumbers,
  parseExploreCatalogQuery,
} from "@/lib/explore/catalog-params";

const STORE_SEARCH_ORIGIN = "https://store.steampowered.com";
const GAMES_PER_PAGE = 24;
const PAGE_CACHE_TTL_MS = 5 * 60 * 1000;
const TOTAL_COUNT_CACHE_TTL_MS = 15 * 60 * 1000;

const GENRE_TAGS: Record<string, string> = {
  Action: "19",
  Adventure: "21",
  RPG: "122",
  Strategy: "9",
};

const PLATFORM_OS: Record<string, string> = {
  Windows: "win",
  macOS: "mac",
  Linux: "linux",
};

export type ExploreCatalogResult = {
  games: Game[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type SteamSearchItem = {
  name: string | null;
  logo?: string;
};

type SteamSearchJsonResponse = {
  items?: SteamSearchItem[];
};

type SteamStoreSearchItem = {
  type: string;
  name: string;
  id: number;
  tiny_image?: string;
};

type SteamStoreSearchResponse = {
  total?: number;
  items?: SteamStoreSearchItem[];
};

type SteamSearchInfiniteResponse = {
  total_count?: number;
};

type CatalogGameInput = {
  appId: number;
  title: string;
  logoUrl?: string;
  category: string;
};

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const pageCache = new Map<string, CacheEntry<ExploreCatalogResult>>();
const totalCountCache = new Map<string, CacheEntry<number>>();

function cacheGet<T>(cache: Map<string, CacheEntry<T>>, key: string) {
  const entry = cache.get(key);
  if (!entry || entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  return entry.value;
}

function cacheSet<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  value: T,
  ttlMs: number,
) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

function extractAppIdFromLogo(logo?: string) {
  if (!logo) return null;

  const match = logo.match(/\/apps\/(\d+)\//);
  const appId = match ? Number(match[1]) : Number.NaN;

  return Number.isInteger(appId) && appId > 0 ? appId : null;
}

function usesStoreSearchFilters(query: ExploreCatalogQuery) {
  return Boolean(query.genre || query.platform || query.sortBy);
}

function buildSearchParams(query: ExploreCatalogQuery) {
  const params = new URLSearchParams();
  params.set("page", String(query.page));
  params.set("count", String(GAMES_PER_PAGE));
  params.set("json", "1");
  params.set("category1", "998");
  params.set("supportedlang", "english");
  params.set("ignore_preferences", "1");

  if (query.term) {
    params.set("term", query.term);
  }

  if (query.hideDlc) {
    params.set("ndl", "1");
  }

  if (query.platform && PLATFORM_OS[query.platform]) {
    params.set("os", PLATFORM_OS[query.platform]);
  }

  if (query.genre && GENRE_TAGS[query.genre]) {
    params.set("tags", GENRE_TAGS[query.genre]);
  }

  if (query.sortBy === "Most Popular") {
    params.set("filter", "globaltopsellers");
  } else if (query.sortBy === "Newest") {
    params.set("sort_by", "Released_DESC");
  } else if (query.sortBy === "Name") {
    params.set("sort_by", "Name_ASC");
  }

  return params;
}

function buildTotalCountParams(query: ExploreCatalogQuery) {
  const params = buildSearchParams({ ...query, page: 1 });
  params.delete("json");
  params.set("infinite", "1");
  params.set("dynamic_data", "");
  return params;
}

function getCatalogCacheKey(query: ExploreCatalogQuery) {
  return JSON.stringify(query);
}

function getTotalCountCacheKey(query: ExploreCatalogQuery) {
  const { page: _page, ...rest } = query;
  return JSON.stringify(rest);
}

async function fetchSteamSearchItems(query: ExploreCatalogQuery) {
  const params = buildSearchParams(query);
  const response = await fetch(
    new URL(`/search/results/?${params.toString()}`, STORE_SEARCH_ORIGIN),
    {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 300 },
    },
  );

  if (!response.ok) {
    throw new Error(`Steam catalog request failed (${response.status}).`);
  }

  const payload = (await response.json()) as SteamSearchJsonResponse;
  return payload.items ?? [];
}

async function fetchSteamStoreSearch(term: string) {
  const params = new URLSearchParams({
    term,
    l: "english",
    cc: "US",
  });
  const response = await fetch(
    new URL(`/api/storesearch/?${params.toString()}`, STORE_SEARCH_ORIGIN),
    {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 300 },
    },
  );

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as SteamStoreSearchResponse;
  return (payload.items ?? []).filter(
    (item) => item.type === "app" && !isExcludedAppName(item.name),
  );
}

async function fetchSteamTotalCount(query: ExploreCatalogQuery) {
  const cacheKey = getTotalCountCacheKey(query);
  const cached = cacheGet(totalCountCache, cacheKey);
  if (cached !== null) return cached;

  const params = buildTotalCountParams(query);
  const response = await fetch(
    new URL(`/search/results/?${params.toString()}`, STORE_SEARCH_ORIGIN),
    {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 900 },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Steam catalog total count request failed (${response.status}).`,
    );
  }

  const payload = (await response.json()) as SteamSearchInfiniteResponse;
  const totalCount =
    typeof payload.total_count === "number" && payload.total_count >= 0
      ? payload.total_count
      : 0;

  cacheSet(totalCountCache, cacheKey, totalCount, TOTAL_COUNT_CACHE_TTL_MS);
  return totalCount;
}

function toCatalogGameInput(
  item: SteamSearchItem,
  category: string,
): CatalogGameInput | null {
  const appId = extractAppIdFromLogo(item.logo);
  const title = item.name?.trim();

  if (!appId || !title) return null;

  return {
    appId,
    title,
    logoUrl: item.logo,
    category,
  };
}

function isPlayableCatalogInput(input: CatalogGameInput) {
  if (isExcludedAppName(input.title)) {
    return false;
  }

  const cachedStoreApp = getCachedStoreAppRecord(input.appId);
  if (!cachedStoreApp) {
    return true;
  }

  if (!cachedStoreApp.success || !cachedStoreApp.data) {
    return false;
  }

  return isPlayableSteamStoreApp(cachedStoreApp.data, input.title);
}

function filterCatalogInputs(
  candidates: CatalogGameInput[],
  startIndex: number,
  count: number,
) {
  const playable: CatalogGameInput[] = [];

  for (
    let index = startIndex;
    index < candidates.length && playable.length < count;
    index += 1
  ) {
    const candidate = candidates[index];
    if (isPlayableCatalogInput(candidate)) {
      playable.push(candidate);
    }
  }

  return playable;
}

export function buildExploreGames(inputs: CatalogGameInput[]) {
  return resolveGameListGamesFromDisplays(
    inputs.map((input) => ({
      appId: input.appId,
      logoUrl: input.logoUrl,
      title: input.title,
      category: input.category,
    })),
    { persist: true },
  );
}

async function enrichCatalogGames(games: Game[]) {
  if (games.length === 0) {
    return games;
  }

  return resolveGameListGamesFromDisplays(
    games.map((game) => ({
      appId: Number(game.id),
      title: game.title,
      category: game.category,
    })),
    { persist: true },
  );
}

async function fetchCatalogFromAppListSearch(query: ExploreCatalogQuery) {
  const includeDlc = !query.hideDlc;
  const [storeSearchMatches, appListMatches] = await Promise.all([
    fetchSteamStoreSearch(query.term),
    isSteamAppListCached(includeDlc)
      ? searchSteamAppList(query.term, includeDlc)
      : Promise.resolve([]),
  ]);

  const mergedMatches = new Map<number, CatalogGameInput>();

  for (const match of storeSearchMatches) {
    if (!Number.isInteger(match.id) || match.id <= 0 || !match.name) continue;

    mergedMatches.set(match.id, {
      appId: match.id,
      title: match.name,
      logoUrl: match.tiny_image,
      category: query.genre || "Steam Game",
    });
  }

  for (const match of appListMatches) {
    if (!mergedMatches.has(match.appid)) {
      mergedMatches.set(match.appid, {
        appId: match.appid,
        title: match.name,
        category: query.genre || "Steam Game",
      });
    }
  }

  const orderedMatches = Array.from(mergedMatches.values()).filter(
    (match) => !isExcludedAppName(match.title),
  );
  const totalCount = orderedMatches.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / GAMES_PER_PAGE));
  const page = Math.min(query.page, totalPages);
  const startIndex = (page - 1) * GAMES_PER_PAGE;
  const pageInputs = filterCatalogInputs(
    orderedMatches,
    startIndex,
    GAMES_PER_PAGE,
  );
  const games = await buildExploreGames(pageInputs);

  return {
    games,
    totalCount,
    page,
    pageSize: GAMES_PER_PAGE,
    totalPages,
  };
}

async function fetchCatalogFromStoreSearch(query: ExploreCatalogQuery) {
  const [items, totalCount] = await Promise.all([
    fetchSteamSearchItems(query),
    fetchSteamTotalCount(query),
  ]);

  const inputs = items
    .slice(0, GAMES_PER_PAGE)
    .flatMap((item) => {
      const input = toCatalogGameInput(item, query.genre || "Steam Game");
      if (!input || isExcludedAppName(input.title)) return [];
      return isPlayableCatalogInput(input) ? [input] : [];
    });
  const games = await buildExploreGames(inputs);
  const totalPages = Math.max(1, Math.ceil(totalCount / GAMES_PER_PAGE));

  return {
    games,
    totalCount,
    page: Math.min(query.page, totalPages),
    pageSize: GAMES_PER_PAGE,
    totalPages,
  };
}

export async function fetchExploreCatalog(
  query: ExploreCatalogQuery,
): Promise<ExploreCatalogResult> {
  if (query.sortBy === "Highest Rated" || query.sortBy === "Most Reviewed") {
    const { fetchStatRealmRatedCatalog } = await import(
      "@/lib/explore/rated-catalog"
    );
    return fetchStatRealmRatedCatalog(query);
  }

  const cacheKey = getCatalogCacheKey(query);
  const cached = cacheGet(pageCache, cacheKey);
  if (cached) {
    return {
      ...cached,
      games: await enrichCatalogGames(cached.games),
    };
  }

  const result =
    query.term && !usesStoreSearchFilters(query)
      ? await fetchCatalogFromAppListSearch(query)
      : await fetchCatalogFromStoreSearch(query);

  cacheSet(pageCache, cacheKey, result, PAGE_CACHE_TTL_MS);

  console.info("[Steam Explore Catalog] Page fetched", {
    source:
      query.term && !usesStoreSearchFilters(query)
        ? "app-list-search"
        : "store-search",
    page: result.page,
    totalPages: result.totalPages,
    totalCount: result.totalCount,
    returnedGames: result.games.length,
    term: query.term || null,
    genre: query.genre || null,
    platform: query.platform || null,
    sortBy: query.sortBy || null,
    hideDlc: query.hideDlc,
  });

  return result;
}
