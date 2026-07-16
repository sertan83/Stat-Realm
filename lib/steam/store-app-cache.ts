import "server-only";

import { createResponseCache } from "@/lib/steam/response-cache";

const STORE_API_ORIGIN = "https://store.steampowered.com";
const STORE_APP_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const STORE_APP_NEGATIVE_CACHE_TTL_MS = 30 * 60 * 1000;

type StoreAppCacheValue = {
  success: boolean;
  data: Record<string, unknown> | null;
};

const storeAppCache = createResponseCache<StoreAppCacheValue>();
const inFlightStoreAppFetches = new Map<
  number,
  Promise<FetchStoreAppDataResult>
>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export type FetchStoreAppDataResult = {
  success: boolean;
  data: Record<string, unknown> | null;
  source: "cache" | "api";
};

async function requestStoreAppData(
  appId: number,
): Promise<StoreAppCacheValue> {
  const url = new URL("/api/appdetails", STORE_API_ORIGIN);
  url.searchParams.set("appids", String(appId));
  url.searchParams.set("l", "english");
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    return { success: false, data: null };
  }

  const payload: unknown = await response.json();
  const appResponse = isRecord(payload) ? payload[String(appId)] : undefined;

  if (
    !isRecord(appResponse) ||
    appResponse.success !== true ||
    !isRecord(appResponse.data)
  ) {
    return { success: false, data: null };
  }

  return {
    success: true,
    data: appResponse.data,
  };
}

export async function fetchStoreAppData(
  appId: number,
): Promise<FetchStoreAppDataResult> {
  const cacheKey = String(appId);
  const cached = storeAppCache.get(cacheKey);

  if (cached) {
    return {
      success: cached.success,
      data: cached.data,
      source: "cache",
    };
  }

  const inFlight = inFlightStoreAppFetches.get(appId);
  if (inFlight) {
    return inFlight;
  }

  const fetchPromise = (async () => {
    try {
      const value = await requestStoreAppData(appId);
      storeAppCache.set(
        cacheKey,
        value,
        value.success
          ? STORE_APP_CACHE_TTL_MS
          : STORE_APP_NEGATIVE_CACHE_TTL_MS,
      );

      return {
        success: value.success,
        data: value.data,
        source: "api" as const,
      };
    } catch {
      const value = { success: false, data: null };
      storeAppCache.set(cacheKey, value, STORE_APP_NEGATIVE_CACHE_TTL_MS);
      return {
        ...value,
        source: "api" as const,
      };
    } finally {
      inFlightStoreAppFetches.delete(appId);
    }
  })();

  inFlightStoreAppFetches.set(appId, fetchPromise);
  return fetchPromise;
}

export function parseStoreAppGenres(data: Record<string, unknown>) {
  const rawGenres = data.genres;

  if (!Array.isArray(rawGenres)) {
    return [];
  }

  return rawGenres.flatMap((genre) =>
    isRecord(genre) && typeof genre.description === "string"
      ? [genre.description]
      : [],
  );
}

export function getCachedStoreAppGenres(appId: number) {
  const cached = storeAppCache.get(String(appId));
  if (!cached?.success || !cached.data) {
    return undefined;
  }

  return parseStoreAppGenres(cached.data);
}

export function getCachedStoreAppRecord(appId: number) {
  return storeAppCache.get(String(appId)) ?? null;
}
