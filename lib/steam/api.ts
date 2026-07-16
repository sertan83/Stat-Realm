import "server-only";

import { cache } from "react";
import { getSteamProfile } from "@/lib/auth/steam";
import { createResponseCache } from "@/lib/steam/response-cache";

const STEAM_API_ORIGIN = "https://api.steampowered.com";
const STEAM_LIBRARY_CACHE_TTL_MS = 5 * 60 * 1000;
const STEAM_RECENT_CACHE_TTL_MS = 2 * 60 * 1000;
const STEAM_ACHIEVEMENT_CACHE_TTL_MS = 5 * 60 * 1000;
const STEAM_SCHEMA_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const steamResponseCache = createResponseCache<unknown>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toFiniteNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  if (typeof value !== "number" && typeof value !== "string") {
    return undefined;
  }

  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function resolveSteamAchievementIconUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed.startsWith("https://")) {
    return null;
  }

  try {
    const url = new URL(trimmed);

    if (url.protocol !== "https:") {
      return null;
    }

    if (
      url.pathname.includes("/steamcommunity/public/images/apps/") ||
      url.pathname.includes("/images/apps/") ||
      url.hostname.includes("steamstatic") ||
      url.hostname.includes("akamai") ||
      url.hostname.includes("steamcdn")
    ) {
      return trimmed;
    }
  } catch {
    return null;
  }

  return null;
}

export type SteamOwnedGame = {
  appid: number;
  name?: string;
  playtime_forever: number;
  playtime_2weeks?: number;
  img_icon_url?: string;
  rtime_last_played?: number;
  has_community_visible_stats?: boolean;
  capsule_filename?: string;
};

export type SteamAchievement = {
  apiname: string;
  achieved: 0 | 1;
  unlocktime: number;
  name?: string;
  description?: string;
};

export type SteamAchievementProgress = {
  total: number;
  unlocked: number;
  percentage: number;
  achievements: SteamAchievement[];
};

export type SteamGameAchievement = {
  apiName: string;
  name: string;
  description?: string;
  iconUrl: string;
  isUnlocked: boolean;
  unlockTime?: number;
  globalUnlockPercentage?: number;
};

export type SteamAchievementSchemaEntry = {
  apiName: string;
  name: string;
  description?: string;
  iconUrl: string;
  lockedIconUrl: string;
};

export type SteamAchievementSchemaResult =
  | {
      status: "complete";
      achievements: Map<string, SteamAchievementSchemaEntry>;
    }
  | { status: "empty" }
  | { status: "unavailable" };

export type SteamAchievementProgressResult =
  | { status: "complete"; progress: SteamAchievementProgress }
  | { status: "unsupported" }
  | { status: "unavailable"; httpStatus?: number; reason?: string };

export class SteamApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly responseBody?: string,
  ) {
    super(message);
    this.name = "SteamApiError";
  }
}

async function steamRequest<T>(
  path: string,
  params: Record<string, string>,
  options?: { cacheTtlMs?: number },
): Promise<T> {
  const cacheKey = `${path}?${Object.entries(params)
    .sort(([firstKey], [secondKey]) => firstKey.localeCompare(secondKey))
    .map(([key, value]) => `${key}=${value}`)
    .join("&")}`;
  const cacheTtlMs = options?.cacheTtlMs ?? 0;

  if (cacheTtlMs > 0) {
    const cached = steamResponseCache.get(cacheKey);
    if (cached !== undefined) {
      return cached as T;
    }
  }

  const apiKey = process.env.STEAM_API_KEY;

  if (!apiKey) {
    throw new Error("STEAM_API_KEY is not configured.");
  }

  const url = new URL(path, STEAM_API_ORIGIN);
  url.searchParams.set("key", apiKey);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    const responseBody = await response.text().catch(() => undefined);
    throw new SteamApiError(
      `Steam API request failed for ${path} (${response.status}).`,
      response.status,
      responseBody,
    );
  }

  const data = (await response.json()) as T;

  if (cacheTtlMs > 0) {
    steamResponseCache.set(cacheKey, data, cacheTtlMs);
  }

  return data;
}

export const getAuthenticatedSteamProfile = cache(getSteamProfile);

export const getOwnedGamesLibrary = cache(async (steamId: string) => {
  const requestParams = {
    steamid: steamId,
    include_appinfo: "true",
    include_extended_appinfo: "true",
    include_played_free_games: "true",
    include_free_sub: "true",
    skip_unvetted_apps: "false",
    format: "json",
  };

  console.info("[Steam Sync] GetOwnedGames request", {
    url: `${STEAM_API_ORIGIN}/IPlayerService/GetOwnedGames/v0001/`,
    key: "[redacted]",
    ...requestParams,
  });

  const data = await steamRequest<{
    response?: { game_count?: number; games?: SteamOwnedGame[] };
  }>("/IPlayerService/GetOwnedGames/v0001/", requestParams, {
    cacheTtlMs: STEAM_LIBRARY_CACHE_TTL_MS,
  });

  if (data.response?.game_count === undefined && !data.response?.games) {
    throw new Error(
      "Steam owned games are unavailable. The user's Game details may be private.",
    );
  }

  const games = data.response?.games ?? [];
  const rawGameCount = data.response?.game_count ?? games.length;

  console.info("[Steam Sync] GetOwnedGames raw response", {
    gameCount: rawGameCount,
    returnedGameRecords: games.length,
  });

  // No owned games are filtered by StatRealm.
  const displayedGameCount = rawGameCount;

  console.info("[Steam Sync] GetOwnedGames final count", {
    displayedGameCount,
    filteredOutByStatRealm: 0,
  });

  return {
    gameCount: displayedGameCount,
    games,
  };
});

export const getOwnedGames = cache(
  async (steamId: string) => (await getOwnedGamesLibrary(steamId)).games,
);

export const getRecentlyPlayedGames = cache(
  async (steamId: string, count = 8) => {
    const data = await steamRequest<{
      response?: { total_count?: number; games?: SteamOwnedGame[] };
    }>("/IPlayerService/GetRecentlyPlayedGames/v0001/", {
      steamid: steamId,
      count: String(count),
      format: "json",
    }, {
      cacheTtlMs: STEAM_RECENT_CACHE_TTL_MS,
    });

    return data.response?.games ?? [];
  },
);

export const getSteamLevel = cache(async (steamId: string) => {
  const data = await steamRequest<{ response?: { player_level?: number } }>(
    "/IPlayerService/GetSteamLevel/v0001/",
    { steamid: steamId, format: "json" },
    { cacheTtlMs: STEAM_LIBRARY_CACHE_TTL_MS },
  );

  return data.response?.player_level ?? null;
});

export async function fetchAchievementProgressResult(
    steamId: string,
    appId: number,
  ): Promise<SteamAchievementProgressResult> {
    try {
      const data = await steamRequest<{
        playerstats?: {
          success?: boolean;
          achievements?: unknown;
          error?: unknown;
        };
      }>("/ISteamUserStats/GetPlayerAchievements/v0001/", {
        steamid: steamId,
        appid: String(appId),
        l: "english",
      }, {
        cacheTtlMs: STEAM_ACHIEVEMENT_CACHE_TTL_MS,
      });
      const rawAchievements = data.playerstats?.achievements;

      if (!data.playerstats?.success) {
        const error =
          typeof data.playerstats?.error === "string"
            ? data.playerstats.error
            : "";

        return /no stats|does not have stats|not found/i.test(error)
          ? { status: "unsupported" }
          : { status: "unavailable" };
      }

      if (!Array.isArray(rawAchievements)) {
        return { status: "unavailable" };
      }

      const achievements: SteamAchievement[] = rawAchievements.flatMap(
        (achievement) => {
          if (
            !isRecord(achievement) ||
            typeof achievement.apiname !== "string"
          ) {
            return [];
          }

          const achieved = toFiniteNumber(achievement.achieved);
          const unlocktime = toFiniteNumber(achievement.unlocktime);

          if (achieved !== 0 && achieved !== 1) {
            return [];
          }

          return [
            {
              apiname: achievement.apiname,
              achieved,
              unlocktime: unlocktime ?? 0,
              name:
                typeof achievement.name === "string"
                  ? achievement.name
                  : undefined,
              description:
                typeof achievement.description === "string"
                  ? achievement.description
                  : undefined,
            },
          ];
        },
      );
      const unlocked = achievements.filter(
        (achievement) => achievement.achieved === 1,
      ).length;

      return {
        status: "complete",
        progress: {
          total: achievements.length,
          unlocked,
          percentage:
            achievements.length > 0
              ? Math.round((unlocked / achievements.length) * 100)
              : 0,
          achievements,
        },
      };
    } catch (error) {
      if (
        error instanceof SteamApiError &&
        /no stats|does not have stats|not found/i.test(
          error.responseBody ?? "",
        )
      ) {
        return { status: "unsupported" };
      }

      return error instanceof SteamApiError
        ? {
            status: "unavailable",
            httpStatus: error.status,
            reason: error.responseBody,
          }
        : { status: "unavailable" };
    }
}

export const getAchievementProgressResult = cache(
  fetchAchievementProgressResult,
);

export const getAchievementProgress = cache(
  async (steamId: string, appId: number) => {
    const result = await getAchievementProgressResult(steamId, appId);
    return result.status === "complete" ? result.progress : null;
  },
);

export type SteamGlobalPercentagesResult =
  | { status: "complete"; percentages: Map<string, number> }
  | { status: "unavailable" };

export async function fetchGlobalAchievementPercentagesResult(
  appId: number,
): Promise<SteamGlobalPercentagesResult> {
    try {
      const data = await steamRequest<{
        achievementpercentages?: {
          achievements?: unknown;
        };
      }>("/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v0002/", {
        gameid: String(appId),
        format: "json",
      }, {
        cacheTtlMs: STEAM_SCHEMA_CACHE_TTL_MS,
      });
      const rawPercentages =
        data.achievementpercentages?.achievements;

      if (!Array.isArray(rawPercentages)) {
        return { status: "unavailable" };
      }

      console.info("[Steam Achievements] Global percentage runtime types", {
        appId,
        types: Array.from(
          new Set(
            rawPercentages.map((achievement) =>
              isRecord(achievement)
                ? achievement.percent === null
                  ? "null"
                  : typeof achievement.percent
                : typeof achievement,
            ),
          ),
        ),
      });

      const percentages = new Map<string, number>(
        rawPercentages.flatMap((achievement) => {
          if (
            !isRecord(achievement) ||
            typeof achievement.name !== "string"
          ) {
            return [];
          }

          const percent = toFiniteNumber(achievement.percent);
          return percent === undefined
            ? []
            : [[achievement.name.toLocaleLowerCase(), percent]];
        }),
      );

      return { status: "complete", percentages };
    } catch {
      return { status: "unavailable" };
    }
}

export const getGlobalAchievementPercentagesResult = cache(
  fetchGlobalAchievementPercentagesResult,
);

export async function fetchAchievementSchemaResult(
  appId: number,
): Promise<SteamAchievementSchemaResult> {
  try {
    const data = await steamRequest<{
      game?: {
        availableGameStats?: {
          achievements?: unknown;
        };
      };
    }>("/ISteamUserStats/GetSchemaForGame/v0002/", {
      appid: String(appId),
      l: "english",
    }, {
      cacheTtlMs: STEAM_SCHEMA_CACHE_TTL_MS,
    });
    const rawAchievements =
      data.game?.availableGameStats?.achievements;

    if (!Array.isArray(rawAchievements)) {
      return { status: "unavailable" };
    }

    if (rawAchievements.length === 0) {
      return { status: "empty" };
    }

    const achievements = new Map<string, SteamAchievementSchemaEntry>(
      rawAchievements.flatMap((achievement) => {
        if (!isRecord(achievement) || typeof achievement.name !== "string") {
          return [];
        }

        const apiName = achievement.name;
        const displayName =
          typeof achievement.displayName === "string"
            ? achievement.displayName
            : apiName;
        const iconUrl = resolveSteamAchievementIconUrl(achievement.icon);
        const lockedIconUrl =
          resolveSteamAchievementIconUrl(achievement.icongray) ?? iconUrl;

        if (!iconUrl || !lockedIconUrl) {
          return [];
        }

        return [
          [
            apiName.toLocaleLowerCase(),
            {
              apiName,
              name: displayName,
              description:
                typeof achievement.description === "string"
                  ? achievement.description
                  : undefined,
              iconUrl,
              lockedIconUrl,
            },
          ],
        ];
      }),
    );

    if (achievements.size === 0) {
      return { status: "unavailable" };
    }

    return { status: "complete", achievements };
  } catch {
    return { status: "unavailable" };
  }
}

export const getAchievementSchemaResult = cache(
  fetchAchievementSchemaResult,
);

export const getPublicGameAchievements = cache(
  async (appId: number): Promise<SteamGameAchievement[]> => {
    const [schema, globalPercentages] = await Promise.all([
      getAchievementSchemaResult(appId),
      getGlobalAchievementPercentagesResult(appId),
    ]);

    if (schema.status !== "complete" || schema.achievements.size === 0) {
      return [];
    }

    const percentages =
      globalPercentages.status === "complete"
        ? globalPercentages.percentages
        : new Map<string, number>();

    return Array.from(schema.achievements.values())
      .map((achievement) => ({
        apiName: achievement.apiName,
        name: achievement.name,
        description: achievement.description,
        iconUrl: achievement.lockedIconUrl,
        isUnlocked: false,
        unlockTime: undefined,
        globalUnlockPercentage: percentages.get(
          achievement.apiName.toLocaleLowerCase(),
        ),
      }))
      .sort((first, second) => {
        const firstPercentage =
          first.globalUnlockPercentage ?? Number.POSITIVE_INFINITY;
        const secondPercentage =
          second.globalUnlockPercentage ?? Number.POSITIVE_INFINITY;
        return firstPercentage - secondPercentage;
      });
  },
);

export const getGameAchievements = cache(
  async (
    steamId: string,
    appId: number,
  ): Promise<SteamGameAchievement[]> => {
    const [progressResult, schema, globalPercentages] = await Promise.all([
      getAchievementProgressResult(steamId, appId),
      getAchievementSchemaResult(appId),
      getGlobalAchievementPercentagesResult(appId),
    ]);

    if (schema.status !== "complete" || schema.achievements.size === 0) {
      return [];
    }

    const progress =
      progressResult.status === "complete" ? progressResult.progress : null;
    const playerAchievements = new Map(
      (progress?.achievements ?? []).map((achievement) => [
        achievement.apiname.toLocaleLowerCase(),
        achievement,
      ]),
    );
    const percentages =
      globalPercentages.status === "complete"
        ? globalPercentages.percentages
        : new Map<string, number>();

    return Array.from(schema.achievements.values())
      .map((achievement) => {
        const playerAchievement = playerAchievements.get(
          achievement.apiName.toLocaleLowerCase(),
        );
        const isUnlocked = playerAchievement?.achieved === 1;
        const globalUnlockPercentage = percentages.get(
          achievement.apiName.toLocaleLowerCase(),
        );

        return {
          apiName: achievement.apiName,
          name: achievement.name,
          description: achievement.description,
          iconUrl: isUnlocked
            ? achievement.iconUrl
            : achievement.lockedIconUrl,
          isUnlocked: Boolean(isUnlocked),
          unlockTime:
            isUnlocked && (playerAchievement?.unlocktime ?? 0) > 0
              ? playerAchievement?.unlocktime
              : undefined,
          globalUnlockPercentage,
        };
      })
      .sort((first, second) => {
        const firstPercentage =
          first.globalUnlockPercentage ?? Number.POSITIVE_INFINITY;
        const secondPercentage =
          second.globalUnlockPercentage ?? Number.POSITIVE_INFINITY;
        return firstPercentage - secondPercentage;
      });
  },
);

export function getSteamAppIdFromImage(imageUrl: string) {
  const appId = Number(imageUrl.match(/\/apps\/(\d+)\//)?.[1]);
  return Number.isInteger(appId) ? appId : null;
}

export function getSteamHeaderImage(appId: number) {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;
}

export {
  buildSteamDashboardGameImage,
  enrichDashboardGamesWithSteamImages,
  getSteamLibraryImageUrls,
} from "@/lib/steam/game-images";
export type { SteamImageCandidate } from "@/types/steam-images";

export function formatPlaytime(minutes: number) {
  const hours = minutes / 60;
  return hours >= 100
    ? `${Math.round(hours).toLocaleString()}h`
    : `${hours.toFixed(1)}h`;
}

export function formatLastPlayed(timestamp?: number) {
  if (!timestamp) {
    return "Recently";
  }

  const elapsedDays = Math.floor(
    (Date.now() - timestamp * 1000) / (24 * 60 * 60 * 1000),
  );

  if (elapsedDays <= 0) return "Today";
  if (elapsedDays === 1) return "Yesterday";
  if (elapsedDays < 7) return `${elapsedDays} days ago`;
  if (elapsedDays < 14) return "1 week ago";
  return `${Math.floor(elapsedDays / 7)} weeks ago`;
}
