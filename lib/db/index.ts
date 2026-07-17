import "server-only";

import type {
  CommunityAggregates,
  MostOwnedAggregate,
  MostPlayedAggregate,
  StatRealmDb,
  StatRealmUser,
  StoredProfileAnalytics,
  StoredUnlockedAchievement,
  UserLibraryGame,
} from "@/lib/db/types";
import {
  readPersistedDb,
  writePersistedDb,
} from "@/lib/db/persistence";
import {
  createEmptyUserStats,
  normalizeUserStats,
} from "@/lib/user/synced-statistics";

const TOP_COMMUNITY_RANKINGS = 10;

function normalizeStoredAchievementHistory(
  achievement: Partial<StoredUnlockedAchievement> &
    Pick<StoredUnlockedAchievement, "id">,
): StoredUnlockedAchievement | null {
  const appId = achievement.appId;
  const unlockTime = achievement.unlockTime;

  if (
    typeof appId !== "number" ||
    !Number.isInteger(appId) ||
    appId <= 0 ||
    typeof unlockTime !== "number" ||
    !Number.isFinite(unlockTime) ||
    unlockTime <= 0
  ) {
    return null;
  }

  return {
    id: achievement.id,
    appId,
    apiName: achievement.apiName ?? "",
    name: achievement.name ?? "Achievement",
    gameName: achievement.gameName ?? `Steam App ${appId}`,
    iconUrl: achievement.iconUrl ?? "",
    unlockTime,
  };
}

function normalizeStoredProfileAnalytics(
  analytics: Partial<StoredProfileAnalytics>,
): StoredProfileAnalytics | null {
  const genrePlaytime = Array.isArray(analytics.genrePlaytime)
    ? analytics.genrePlaytime.flatMap((genre) => {
        if (
          typeof genre?.genre !== "string" ||
          typeof genre?.hours !== "string" ||
          typeof genre?.percentage !== "number"
        ) {
          return [];
        }

        return [
          {
            genre: genre.genre,
            hours: genre.hours,
            percentage: genre.percentage,
          },
        ];
      })
    : null;

  const completionOverview =
    typeof analytics.completionOverview === "object" &&
    analytics.completionOverview !== null &&
    typeof analytics.completionOverview.completed === "number" &&
    typeof analytics.completionOverview.inProgress === "number" &&
    typeof analytics.completionOverview.untouched === "number"
      ? {
          completed: analytics.completionOverview.completed,
          inProgress: analytics.completionOverview.inProgress,
          untouched: analytics.completionOverview.untouched,
        }
      : null;

  if (
    (!genrePlaytime || genrePlaytime.length === 0) &&
    !completionOverview
  ) {
    return null;
  }

  return {
    genrePlaytime:
      genrePlaytime && genrePlaytime.length > 0 ? genrePlaytime : null,
    completionOverview,
    syncedAt:
      typeof analytics.syncedAt === "string"
        ? analytics.syncedAt
        : new Date().toISOString(),
  };
}

function normalizeStoredUser(
  user: Partial<StatRealmUser> & Pick<StatRealmUser, "steamId">,
): StatRealmUser {
  const avatar = user.avatar ?? "";
  const avatarMedium = user.avatarMedium ?? avatar;
  const avatarUrl = user.avatarUrl ?? avatarMedium ?? avatar;

  return {
    steamId: user.steamId,
    displayName: user.displayName ?? "",
    avatar,
    avatarMedium,
    avatarUrl,
    profileUrl:
      user.profileUrl ??
      `https://steamcommunity.com/profiles/${user.steamId}`,
    registeredAt: user.registeredAt ?? new Date().toISOString(),
    lastSyncedAt: user.lastSyncedAt ?? new Date().toISOString(),
    lastLoginAt:
      typeof user.lastLoginAt === "string" && user.lastLoginAt.length > 0
        ? user.lastLoginAt
        : null,
    stats: normalizeUserStats(user.stats),
  };
}

function normalizeStoredLibraryGame(
  game: Partial<UserLibraryGame> & Pick<UserLibraryGame, "appId" | "name">,
): UserLibraryGame {
  return {
    appId: game.appId,
    name: game.name,
    playtimeMinutes: game.playtimeMinutes ?? 0,
    playtimeTwoWeeksMinutes: game.playtimeTwoWeeksMinutes ?? 0,
    lastPlayedAt:
      typeof game.lastPlayedAt === "number" && game.lastPlayedAt > 0
        ? game.lastPlayedAt
        : null,
    achievementsUnlocked: game.achievementsUnlocked ?? null,
    achievementsTotal: game.achievementsTotal ?? null,
    completionPercentage: game.completionPercentage ?? null,
    perfectGame: game.perfectGame ?? null,
  };
}

async function readDbFile(): Promise<StatRealmDb> {
  const parsed = await readPersistedDb();

  return {
      users: Object.fromEntries(
        Object.entries(parsed.users ?? {}).map(([steamId, user]) => [
          steamId,
          normalizeStoredUser({
            ...(user as Partial<StatRealmUser>),
            steamId,
          }),
        ]),
      ),
      libraries: Object.fromEntries(
        Object.entries(parsed.libraries ?? {}).map(([steamId, library]) => [
          steamId,
          (library as Partial<UserLibraryGame>[]).map((game) =>
            normalizeStoredLibraryGame({
              ...game,
              appId: game.appId ?? 0,
              name: game.name ?? `Steam App ${game.appId}`,
            }),
          ),
        ]),
      ),
      achievementHistories: Object.fromEntries(
        Object.entries(parsed.achievementHistories ?? {}).flatMap(
          ([steamId, history]) => {
            const normalizedHistory = (history as Partial<StoredUnlockedAchievement>[])
              .flatMap((achievement) => {
                if (!achievement?.id) return [];

                return normalizeStoredAchievementHistory({
                  ...achievement,
                  id: achievement.id,
                }) ?? [];
              })
              .sort((first, second) => second.unlockTime - first.unlockTime);

            return normalizedHistory.length > 0
              ? [[steamId, normalizedHistory] as const]
              : [];
          },
        ),
      ),
      profileAnalytics: Object.fromEntries(
        Object.entries(parsed.profileAnalytics ?? {}).flatMap(
          ([steamId, analytics]) => {
            const normalized = normalizeStoredProfileAnalytics(
              analytics as Partial<StoredProfileAnalytics>,
            );

            return normalized ? [[steamId, normalized] as const] : [];
          },
        ),
      ),
      aggregates: {
        mostPlayed: parsed.aggregates?.mostPlayed ?? [],
        mostOwned: parsed.aggregates?.mostOwned ?? [],
        updatedAt: parsed.aggregates?.updatedAt ?? null,
      },
    };
}

async function writeDbFile(db: StatRealmDb) {
  await writePersistedDb(db);
}

let writeQueue: Promise<unknown> = Promise.resolve();

function withDbLock<T>(operation: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(operation, operation);
  writeQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

function pickGameName(
  currentName: string | undefined,
  nextName: string,
): string {
  if (!currentName) {
    return nextName;
  }

  return nextName.length > currentName.length ? nextName : currentName;
}

function rebuildCommunityAggregates(
  libraries: Record<string, UserLibraryGame[]>,
): CommunityAggregates {
  const playtimeByAppId = new Map<
    number,
    { name: string; totalPlaytimeMinutes: number }
  >();
  const ownersByAppId = new Map<
    number,
    { name: string; ownerCount: number }
  >();

  for (const library of Object.values(libraries)) {
    for (const game of library) {
      const playtimeEntry = playtimeByAppId.get(game.appId);
      playtimeByAppId.set(game.appId, {
        name: pickGameName(playtimeEntry?.name, game.name),
        totalPlaytimeMinutes:
          (playtimeEntry?.totalPlaytimeMinutes ?? 0) + game.playtimeMinutes,
      });

      const ownerEntry = ownersByAppId.get(game.appId);
      ownersByAppId.set(game.appId, {
        name: pickGameName(ownerEntry?.name, game.name),
        ownerCount: (ownerEntry?.ownerCount ?? 0) + 1,
      });
    }
  }

  const mostPlayed: MostPlayedAggregate[] = Array.from(
    playtimeByAppId.entries(),
  )
    .filter(([, value]) => value.totalPlaytimeMinutes > 0)
    .sort(
      (a, b) => b[1].totalPlaytimeMinutes - a[1].totalPlaytimeMinutes,
    )
    .slice(0, TOP_COMMUNITY_RANKINGS)
    .map(([appId, value]) => ({
      appId,
      name: value.name,
      totalPlaytimeMinutes: value.totalPlaytimeMinutes,
    }));

  const mostOwned: MostOwnedAggregate[] = Array.from(ownersByAppId.entries())
    .filter(([, value]) => value.ownerCount > 0)
    .sort((a, b) => b[1].ownerCount - a[1].ownerCount)
    .slice(0, TOP_COMMUNITY_RANKINGS)
    .map(([appId, value]) => ({
      appId,
      name: value.name,
      ownerCount: value.ownerCount,
    }));

  return {
    mostPlayed,
    mostOwned,
    updatedAt: new Date().toISOString(),
  };
}

export async function readCommunityAggregates(): Promise<CommunityAggregates> {
  const db = await readDbFile();
  return db.aggregates;
}

export async function getRegisteredUserCount(): Promise<number> {
  const db = await readDbFile();
  return Object.keys(db.users).length;
}

export async function getAllStatRealmUsers(): Promise<StatRealmUser[]> {
  const db = await readDbFile();
  return Object.values(db.users);
}

export async function getMostRecentLoggedInUser(): Promise<StatRealmUser | null> {
  const users = (await getAllStatRealmUsers()).filter(
    (user): user is StatRealmUser & { lastLoginAt: string } =>
      typeof user.lastLoginAt === "string" && user.lastLoginAt.length > 0,
  );

  if (users.length === 0) {
    return null;
  }

  return [...users].sort(
    (left, right) =>
      new Date(right.lastLoginAt).getTime() -
      new Date(left.lastLoginAt).getTime(),
  )[0];
}

export async function recordStatRealmSteamLogin(steamId: string) {
  await withDbLock(async () => {
    const db = await readDbFile();
    const now = new Date().toISOString();
    const existingUser = db.users[steamId];

    if (existingUser) {
      db.users[steamId] = {
        ...existingUser,
        lastLoginAt: now,
      };
    } else {
      db.users[steamId] = normalizeStoredUser({
        steamId,
        displayName: "",
        avatar: "",
        avatarMedium: "",
        avatarUrl: "",
        profileUrl: `https://steamcommunity.com/profiles/${steamId}`,
        registeredAt: now,
        lastSyncedAt: now,
        lastLoginAt: now,
        stats: createEmptyUserStats(),
      });
    }

    await writeDbFile(db);
  });
}

export async function getAllUsersWithLibraries(): Promise<{
  users: StatRealmUser[];
  libraries: Record<string, UserLibraryGame[]>;
}> {
  const db = await readDbFile();

  return {
    users: Object.values(db.users),
    libraries: db.libraries,
  };
}

export type UserSyncSnapshotCommit = {
  user: Omit<StatRealmUser, "registeredAt" | "lastSyncedAt" | "lastLoginAt">;
  library: UserLibraryGame[];
  achievementHistory?: StoredUnlockedAchievement[];
  profileAnalytics?: {
    genrePlaytime?: StoredProfileAnalytics["genrePlaytime"];
    completionOverview?: StoredProfileAnalytics["completionOverview"];
  };
  replaceAchievementHistory?: boolean;
  recordLogin?: boolean;
};

function normalizeAchievementHistoryList(
  achievements: StoredUnlockedAchievement[],
) {
  return achievements
    .flatMap((achievement) => {
      const normalized = normalizeStoredAchievementHistory(achievement);
      return normalized ? [normalized] : [];
    })
    .sort((first, second) => second.unlockTime - first.unlockTime);
}

export async function commitUserSyncSnapshot(
  steamId: string,
  commit: UserSyncSnapshotCommit,
) {
  await withDbLock(async () => {
    const db = await readDbFile();
    const now = new Date().toISOString();
    const existingUser = db.users[steamId];

    db.users[steamId] = {
      ...commit.user,
      avatar: commit.user.avatar ?? existingUser?.avatar ?? "",
      avatarMedium: commit.user.avatarMedium ?? existingUser?.avatarMedium ?? "",
      avatarUrl: commit.user.avatarUrl ?? existingUser?.avatarUrl ?? "",
      stats: normalizeUserStats(commit.user.stats),
      registeredAt: existingUser?.registeredAt ?? now,
      lastSyncedAt: now,
      lastLoginAt: commit.recordLogin
        ? now
        : (existingUser?.lastLoginAt ?? null),
    };

    db.libraries[steamId] = commit.library.map((game) =>
      normalizeStoredLibraryGame(game),
    );
    db.aggregates = rebuildCommunityAggregates(db.libraries);

    if (commit.achievementHistory !== undefined) {
      const normalizedHistory = normalizeAchievementHistoryList(
        commit.achievementHistory,
      );

      if (normalizedHistory.length > 0) {
        db.achievementHistories[steamId] = normalizedHistory;
      } else if (commit.replaceAchievementHistory) {
        delete db.achievementHistories[steamId];
      }
    }

    if (commit.profileAnalytics !== undefined) {
      const existingAnalytics = db.profileAnalytics[steamId];
      const normalizedAnalytics = normalizeStoredProfileAnalytics({
        genrePlaytime:
          commit.profileAnalytics.genrePlaytime !== undefined
            ? commit.profileAnalytics.genrePlaytime &&
              commit.profileAnalytics.genrePlaytime.length > 0
              ? commit.profileAnalytics.genrePlaytime
              : null
            : (existingAnalytics?.genrePlaytime ?? null),
        completionOverview:
          commit.profileAnalytics.completionOverview !== undefined
            ? commit.profileAnalytics.completionOverview
            : (existingAnalytics?.completionOverview ?? null),
        syncedAt: now,
      });

      if (normalizedAnalytics) {
        db.profileAnalytics[steamId] = normalizedAnalytics;
      } else {
        delete db.profileAnalytics[steamId];
      }
    }

    await writeDbFile(db);
  });
}

export async function getStatRealmUser(
  steamId: string,
): Promise<StatRealmUser | null> {
  const db = await readDbFile();
  return db.users[steamId] ?? null;
}

export async function getUserProfileAnalytics(
  steamId: string,
): Promise<StoredProfileAnalytics | null> {
  const db = await readDbFile();
  return db.profileAnalytics[steamId] ?? null;
}

export async function saveUserProfileAnalytics(
  steamId: string,
  updates: {
    genrePlaytime?: StoredProfileAnalytics["genrePlaytime"];
    completionOverview?: StoredProfileAnalytics["completionOverview"];
  },
) {
  await withDbLock(async () => {
    const db = await readDbFile();
    const existing = db.profileAnalytics[steamId];
    const genrePlaytime =
      updates.genrePlaytime !== undefined
        ? updates.genrePlaytime && updates.genrePlaytime.length > 0
          ? updates.genrePlaytime
          : null
        : (existing?.genrePlaytime ?? null);
    const completionOverview =
      updates.completionOverview !== undefined
        ? updates.completionOverview
        : (existing?.completionOverview ?? null);
    const normalized = normalizeStoredProfileAnalytics({
      genrePlaytime,
      completionOverview,
      syncedAt: new Date().toISOString(),
    });

    if (!normalized) {
      delete db.profileAnalytics[steamId];
    } else {
      db.profileAnalytics[steamId] = normalized;
    }

    await writeDbFile(db);
  });
}

export async function saveUserAchievementHistory(
  steamId: string,
  achievements: StoredUnlockedAchievement[],
  options?: {
    replaceExisting?: boolean;
  },
) {
  await withDbLock(async () => {
    const db = await readDbFile();
    const normalizedHistory = achievements
      .flatMap((achievement) => {
        const normalized = normalizeStoredAchievementHistory(achievement);
        return normalized ? [normalized] : [];
      })
      .sort((first, second) => second.unlockTime - first.unlockTime);

    if (normalizedHistory.length === 0) {
      if (options?.replaceExisting) {
        delete db.achievementHistories[steamId];
      }

      await writeDbFile(db);
      return;
    }

    db.achievementHistories[steamId] = normalizedHistory;

    await writeDbFile(db);
  });
}

export async function getUserAchievementHistory(
  steamId: string,
): Promise<StoredUnlockedAchievement[]> {
  const db = await readDbFile();
  return db.achievementHistories[steamId] ?? [];
}

export async function getUserLibrary(
  steamId: string,
): Promise<UserLibraryGame[]> {
  const db = await readDbFile();
  return db.libraries[steamId] ?? [];
}

export async function upsertStatRealmUser(
  user: Omit<StatRealmUser, "registeredAt" | "lastSyncedAt" | "lastLoginAt">,
  options?: { recordLogin?: boolean },
) {
  await withDbLock(async () => {
    const db = await readDbFile();
    const now = new Date().toISOString();
    const existingUser = db.users[user.steamId];

    db.users[user.steamId] = {
      ...user,
      avatar: user.avatar ?? existingUser?.avatar ?? "",
      avatarMedium: user.avatarMedium ?? existingUser?.avatarMedium ?? "",
      avatarUrl: user.avatarUrl ?? existingUser?.avatarUrl ?? "",
      stats: normalizeUserStats(user.stats),
      registeredAt: existingUser?.registeredAt ?? now,
      lastSyncedAt: now,
      lastLoginAt: options?.recordLogin
        ? now
        : (existingUser?.lastLoginAt ?? null),
    };

    await writeDbFile(db);
  });
}

export async function replaceUserLibrary(
  steamId: string,
  games: UserLibraryGame[],
) {
  await withDbLock(async () => {
    const db = await readDbFile();
    const now = new Date().toISOString();

    db.libraries[steamId] = games.map((game) => normalizeStoredLibraryGame(game));
    db.aggregates = rebuildCommunityAggregates(db.libraries);

    if (db.users[steamId]) {
      db.users[steamId].lastSyncedAt = now;
    }

    await writeDbFile(db);
  });
}
