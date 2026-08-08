import "server-only";

import { cache } from "react";
import { getPersistedDbSnapshot } from "@/lib/db/persistence";
import type {
  StatRealmUser,
  StoredGameMetadata,
  StoredProfileAnalytics,
  StoredUnlockedAchievement,
  UserLibraryGame,
} from "@/lib/db/types";
import {
  createEmptyUserStats,
  normalizeUserStats,
} from "@/lib/user/synced-statistics";
import {
  sanitizeStoredGameName,
} from "@/lib/game-metadata/constants";

const DASHBOARD_ACHIEVEMENT_LIMIT = 100;
const MOST_PLAYED_CATALOG_LIMIT = 24;

function normalizeStoredUser(
  user: Partial<StatRealmUser>,
  steamId: string,
): StatRealmUser | null {
  if (!user || typeof user !== "object") {
    return null;
  }

  const displayName =
    typeof user.displayName === "string" ? user.displayName.trim() : "";

  if (!displayName) {
    return null;
  }

  return {
    steamId,
    displayName,
    avatar: typeof user.avatar === "string" ? user.avatar : "",
    avatarMedium:
      typeof user.avatarMedium === "string" ? user.avatarMedium : "",
    avatarUrl: typeof user.avatarUrl === "string" ? user.avatarUrl : "",
    profileUrl: typeof user.profileUrl === "string" ? user.profileUrl : "",
    registeredAt:
      typeof user.registeredAt === "string"
        ? user.registeredAt
        : new Date().toISOString(),
    lastSyncedAt:
      typeof user.lastSyncedAt === "string" ? user.lastSyncedAt : "",
    lastLoginAt:
      typeof user.lastLoginAt === "string" ? user.lastLoginAt : null,
    stats: normalizeUserStats(user.stats ?? createEmptyUserStats()),
  };
}

function normalizeStoredLibraryGame(
  game: Partial<UserLibraryGame>,
): UserLibraryGame | null {
  const appId = game.appId;

  if (typeof appId !== "number" || !Number.isInteger(appId) || appId <= 0) {
    return null;
  }

  const name = sanitizeStoredGameName(game.name, appId);

  if (!name) {
    return null;
  }

  return {
    appId,
    name,
    playtimeMinutes:
      typeof game.playtimeMinutes === "number" ? game.playtimeMinutes : 0,
    playtimeTwoWeeksMinutes:
      typeof game.playtimeTwoWeeksMinutes === "number"
        ? game.playtimeTwoWeeksMinutes
        : 0,
    lastPlayedAt:
      typeof game.lastPlayedAt === "number" ? game.lastPlayedAt : null,
    achievementsUnlocked:
      typeof game.achievementsUnlocked === "number"
        ? game.achievementsUnlocked
        : null,
    achievementsTotal:
      typeof game.achievementsTotal === "number"
        ? game.achievementsTotal
        : null,
    completionPercentage:
      typeof game.completionPercentage === "number"
        ? game.completionPercentage
        : null,
    perfectGame: typeof game.perfectGame === "boolean" ? game.perfectGame : null,
  };
}

function normalizeStoredProfileAnalytics(
  analytics: Partial<StoredProfileAnalytics> | undefined,
): StoredProfileAnalytics | null {
  if (!analytics || typeof analytics !== "object") {
    return null;
  }

  const genrePlaytime = Array.isArray(analytics.genrePlaytime)
    ? analytics.genrePlaytime.filter(
        (entry) =>
          entry &&
          typeof entry.genre === "string" &&
          typeof entry.hours === "string" &&
          typeof entry.percentage === "number",
      )
    : null;

  const completionOverview =
    analytics.completionOverview &&
    typeof analytics.completionOverview === "object"
      ? {
          completed: Number(analytics.completionOverview.completed) || 0,
          inProgress: Number(analytics.completionOverview.inProgress) || 0,
          untouched: Number(analytics.completionOverview.untouched) || 0,
        }
      : null;

  return {
    genrePlaytime: genrePlaytime && genrePlaytime.length > 0 ? genrePlaytime : null,
    completionOverview,
    syncedAt:
      typeof analytics.syncedAt === "string"
        ? analytics.syncedAt
        : new Date().toISOString(),
  };
}

function normalizeStoredAchievementHistory(
  achievement: Partial<StoredUnlockedAchievement>,
): StoredUnlockedAchievement | null {
  if (!achievement?.id || typeof achievement.id !== "string") {
    return null;
  }

  const appId = achievement.appId;

  if (typeof appId !== "number" || !Number.isInteger(appId) || appId <= 0) {
    return null;
  }

  const name = typeof achievement.name === "string" ? achievement.name.trim() : "";
  const gameName =
    typeof achievement.gameName === "string" ? achievement.gameName.trim() : "";

  if (!name || !gameName) {
    return null;
  }

  return {
    id: achievement.id,
    appId,
    apiName:
      typeof achievement.apiName === "string" ? achievement.apiName : achievement.id,
    name,
    gameName,
    iconUrl:
      typeof achievement.iconUrl === "string" ? achievement.iconUrl : "",
    unlockTime:
      typeof achievement.unlockTime === "number" ? achievement.unlockTime : 0,
  };
}

function normalizeStoredGameMetadataForAppId(
  metadata: Partial<StoredGameMetadata> | undefined,
  appId: number,
): StoredGameMetadata | null {
  if (!metadata || metadata.appId !== appId) {
    return null;
  }

  const name = sanitizeStoredGameName(metadata.name, appId);

  if (!name) {
    return null;
  }

  const images = metadata.images;
  const normalizeList = (value: unknown) =>
    Array.isArray(value)
      ? value.filter((entry): entry is string => typeof entry === "string")
      : undefined;

  const normalizedImages = images
    ? {
        card: normalizeList(images.card),
        header: normalizeList(images.header),
        capsule: normalizeList(images.capsule),
      }
    : undefined;

  return {
    appId,
    name,
    capsuleFilename:
      typeof metadata.capsuleFilename === "string"
        ? metadata.capsuleFilename
        : undefined,
    images: normalizedImages,
    updatedAt:
      typeof metadata.updatedAt === "string"
        ? metadata.updatedAt
        : new Date().toISOString(),
  };
}

export function limitMostPlayedCatalogLibrary(
  library: UserLibraryGame[],
): UserLibraryGame[] {
  const candidates = library.filter(
    (game) => game.playtimeMinutes > 0 || game.playtimeTwoWeeksMinutes > 0,
  );

  const rankedByAllTime = [...candidates]
    .sort((first, second) => second.playtimeMinutes - first.playtimeMinutes)
    .slice(0, MOST_PLAYED_CATALOG_LIMIT);
  const rankedByRecent = [...candidates]
    .sort(
      (first, second) =>
        second.playtimeTwoWeeksMinutes - first.playtimeTwoWeeksMinutes,
    )
    .slice(0, MOST_PLAYED_CATALOG_LIMIT);

  const gamesByAppId = new Map<number, UserLibraryGame>();

  for (const game of [...rankedByAllTime, ...rankedByRecent]) {
    gamesByAppId.set(game.appId, game);
  }

  return [...gamesByAppId.values()];
}

export function getStoredGameMetadataForAppIdsFromSnapshot(
  parsed: Awaited<ReturnType<typeof getPersistedDbSnapshot>>,
  appIds: number[],
) {
  const metadataByAppId = new Map<number, StoredGameMetadata>();

  for (const appId of appIds) {
    const metadata = normalizeStoredGameMetadataForAppId(
      parsed.gameMetadata[String(appId)],
      appId,
    );

    if (metadata) {
      metadataByAppId.set(appId, metadata);
    }
  }

  return metadataByAppId;
}

export const loadDashboardCoreSnapshot = cache(async (steamId: string) => {
  const parsed = await getPersistedDbSnapshot();
  const library = (parsed.libraries[steamId] ?? [])
    .flatMap((game) => {
      const normalized = normalizeStoredLibraryGame(game as Partial<UserLibraryGame>);
      return normalized ? [normalized] : [];
    });

  return {
    user: normalizeStoredUser(parsed.users[steamId] ?? {}, steamId),
    library,
    mostPlayedLibrary: limitMostPlayedCatalogLibrary(library),
    profileAnalytics: normalizeStoredProfileAnalytics(
      parsed.profileAnalytics[steamId],
    ),
  };
});

export const loadDashboardAchievementSnapshot = cache(async (steamId: string) => {
  const parsed = await getPersistedDbSnapshot();

  return (parsed.achievementHistories[steamId] ?? [])
    .flatMap((achievement) => {
      const normalized = normalizeStoredAchievementHistory(
        achievement as Partial<StoredUnlockedAchievement>,
      );
      return normalized ? [normalized] : [];
    })
    .sort((first, second) => second.unlockTime - first.unlockTime)
    .slice(0, DASHBOARD_ACHIEVEMENT_LIMIT);
});
