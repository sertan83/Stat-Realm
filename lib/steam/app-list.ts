import "server-only";

import { slugifyGameName } from "@/lib/slugify-game-name";
import { isExcludedAppName } from "@/lib/steam/playable-games";

const STEAM_WEB_API_ORIGIN = "https://api.steampowered.com";
const APP_LIST_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export type SteamAppListEntry = {
  appid: number;
  name: string;
};

type SteamAppListResponse = {
  response?: {
    apps?: SteamAppListEntry[];
    have_more_results?: boolean;
    last_appid?: number;
  };
};

type AppListCache = {
  expiresAt: number;
  includeDlc: boolean;
  apps: SteamAppListEntry[];
  slugIndex: Map<string, SteamAppListEntry>;
};

const appListCaches = new Map<boolean, AppListCache>();
let inFlightSync: Promise<SteamAppListEntry[]> | null = null;
let inFlightIncludeDlc = true;

function getSteamApiKey() {
  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) {
    throw new Error("STEAM_API_KEY is not configured.");
  }

  return apiKey;
}

async function fetchAppListPage(
  lastAppId: number,
  includeDlc: boolean,
) {
  const params = new URLSearchParams({
    key: getSteamApiKey(),
    include_games: "true",
    include_dlc: includeDlc ? "true" : "false",
    include_software: "false",
    include_videos: "false",
    include_hardware: "false",
    max_results: "50000",
  });

  if (lastAppId > 0) {
    params.set("last_appid", String(lastAppId));
  }

  const response = await fetch(
    new URL(
      `/IStoreService/GetAppList/v1/?${params.toString()}`,
      STEAM_WEB_API_ORIGIN,
    ),
    { cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error(`Steam app list request failed (${response.status}).`);
  }

  return (await response.json()) as SteamAppListResponse;
}

async function synchronizeSteamAppList(includeDlc: boolean) {
  const apps: SteamAppListEntry[] = [];
  let lastAppId = 0;
  let hasMore = true;

  while (hasMore) {
    const payload = await fetchAppListPage(lastAppId, includeDlc);
    const batch = payload.response?.apps ?? [];
    apps.push(...batch);

    hasMore = payload.response?.have_more_results === true;
    lastAppId = payload.response?.last_appid ?? lastAppId;

    if (batch.length === 0) break;
  }

  console.info("[Steam App List] Synchronized", {
    includeDlc,
    apps: apps.length,
  });

  return apps;
}

function buildSlugIndex(apps: SteamAppListEntry[]) {
  const slugIndex = new Map<string, SteamAppListEntry>();

  for (const app of apps) {
    const slug = slugifyGameName(app.name);
    if (!slugIndex.has(slug)) {
      slugIndex.set(slug, app);
    }
  }

  return slugIndex;
}

export async function getSteamAppList(includeDlc = true) {
  const cached = appListCaches.get(includeDlc);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.apps;
  }

  if (inFlightSync && inFlightIncludeDlc === includeDlc) {
    return inFlightSync;
  }

  inFlightIncludeDlc = includeDlc;
  inFlightSync = synchronizeSteamAppList(includeDlc)
    .then((apps) => {
      appListCaches.set(includeDlc, {
        apps,
        includeDlc,
        slugIndex: buildSlugIndex(apps),
        expiresAt: Date.now() + APP_LIST_CACHE_TTL_MS,
      });
      return apps;
    })
    .finally(() => {
      inFlightSync = null;
    });

  return inFlightSync;
}

export function warmSteamAppListIfNeeded(includeDlc = true) {
  const cached = appListCaches.get(includeDlc);
  if (cached && cached.expiresAt > Date.now()) {
    return;
  }

  if (inFlightSync && inFlightIncludeDlc === includeDlc) {
    return;
  }

  void getSteamAppList(includeDlc).catch((error) => {
    console.warn("[Steam App List] Background sync failed", error);
  });
}

function getSearchRank(name: string, term: string) {
  const normalizedName = name.toLocaleLowerCase();
  const normalizedTerm = term.toLocaleLowerCase();

  if (normalizedName === normalizedTerm) return 0;
  if (normalizedName.startsWith(normalizedTerm)) return 1;
  if (normalizedName.includes(normalizedTerm)) return 2;
  return 3;
}

export function isSteamAppListCached(includeDlc = true) {
  const cached = appListCaches.get(includeDlc);
  return Boolean(cached && cached.expiresAt > Date.now());
}

export async function findSteamAppBySlug(slug: string, includeDlc = true) {
  const normalizedSlug = slug.trim().toLocaleLowerCase();
  if (!normalizedSlug) return null;

  const numericAppId = Number(normalizedSlug);
  if (Number.isInteger(numericAppId) && numericAppId > 0) {
    const cached = appListCaches.get(includeDlc);
    if (cached && cached.expiresAt > Date.now()) {
      const match = cached.apps.find((app) => app.appid === numericAppId);
      if (match) return match;
    }

    return {
      appid: numericAppId,
      name: `Steam App ${numericAppId}`,
    };
  }

  const cached = appListCaches.get(includeDlc);
  if (!cached || cached.expiresAt <= Date.now()) {
    return null;
  }

  return cached.slugIndex.get(normalizedSlug) ?? null;
}

export async function searchSteamAppList(
  term: string,
  includeDlc = true,
) {
  const normalizedTerm = term.trim().toLocaleLowerCase();
  if (!normalizedTerm || !isSteamAppListCached(includeDlc)) {
    return [];
  }

  const apps = appListCaches.get(includeDlc)?.apps ?? [];

  return apps
    .filter((app) => app.name.toLocaleLowerCase().includes(normalizedTerm))
    .filter((app) => !isExcludedAppName(app.name))
    .sort((first, second) => {
      const rankDifference =
        getSearchRank(first.name, normalizedTerm) -
        getSearchRank(second.name, normalizedTerm);

      if (rankDifference !== 0) return rankDifference;

      return first.name.localeCompare(second.name);
    });
}
