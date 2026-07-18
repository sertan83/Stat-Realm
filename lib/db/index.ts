import "server-only";

import type {
  CommunityAggregates,
  GameRatingAggregate,
  MostOwnedAggregate,
  MostPlayedAggregate,
  RatingSubmissionLog,
  StatRealmDb,
  StatRealmUser,
  StoredGameRating,
  StoredHelpfulVote,
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

export function createGameRatingKey(steamId: string, appId: number) {
  return `${steamId}:${appId}`;
}

export function createHelpfulVoteKey(voterSteamId: string, ratingKey: string) {
  return `${voterSteamId}:${ratingKey}`;
}

function normalizeRatingValue(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const rounded = Math.round(value * 10) / 10;
  return rounded >= 1 && rounded <= 10 ? rounded : null;
}

function normalizeStoredGameRating(
  rating: Partial<StoredGameRating>,
): StoredGameRating | null {
  const appId = rating.appId;
  const steamId = rating.steamId;
  const normalizedRating = normalizeRatingValue(rating.rating);

  if (
    typeof steamId !== "string" ||
    steamId.length === 0 ||
    typeof appId !== "number" ||
    !Number.isInteger(appId) ||
    appId <= 0 ||
    normalizedRating === null
  ) {
    return null;
  }

  const reviewText =
    typeof rating.reviewText === "string" && rating.reviewText.trim().length > 0
      ? rating.reviewText.trim()
      : null;
  const createdAt =
    typeof rating.createdAt === "string" ? rating.createdAt : new Date().toISOString();
  const updatedAt =
    typeof rating.updatedAt === "string" ? rating.updatedAt : createdAt;

  return {
    steamId,
    appId,
    rating: normalizedRating,
    reviewText,
    createdAt,
    updatedAt,
    editedAt:
      typeof rating.editedAt === "string" && rating.editedAt.length > 0
        ? rating.editedAt
        : null,
  };
}

function normalizeStoredHelpfulVote(
  vote: Partial<StoredHelpfulVote>,
): StoredHelpfulVote | null {
  if (
    typeof vote.ratingKey !== "string" ||
    vote.ratingKey.length === 0 ||
    typeof vote.voterSteamId !== "string" ||
    vote.voterSteamId.length === 0
  ) {
    return null;
  }

  return {
    ratingKey: vote.ratingKey,
    voterSteamId: vote.voterSteamId,
    createdAt:
      typeof vote.createdAt === "string" ? vote.createdAt : new Date().toISOString(),
  };
}

function normalizeGameRatingAggregate(
  aggregate: Partial<GameRatingAggregate>,
): GameRatingAggregate | null {
  const appId = aggregate.appId;

  if (typeof appId !== "number" || !Number.isInteger(appId) || appId <= 0) {
    return null;
  }

  const distribution = Array.from({ length: 10 }, (_, index) => {
    const value = aggregate.distribution?.[index];
    return typeof value === "number" && value >= 0 ? value : 0;
  });

  return {
    appId,
    gameName:
      typeof aggregate.gameName === "string" && aggregate.gameName.length > 0
        ? aggregate.gameName
        : `Steam App ${appId}`,
    averageRating:
      typeof aggregate.averageRating === "number" &&
      Number.isFinite(aggregate.averageRating)
        ? Math.round(aggregate.averageRating * 10) / 10
        : 0,
    totalRatings:
      typeof aggregate.totalRatings === "number" && aggregate.totalRatings >= 0
        ? aggregate.totalRatings
        : 0,
    totalReviews:
      typeof aggregate.totalReviews === "number" && aggregate.totalReviews >= 0
        ? aggregate.totalReviews
        : 0,
    distribution,
    updatedAt:
      typeof aggregate.updatedAt === "string"
        ? aggregate.updatedAt
        : new Date().toISOString(),
  };
}

function ratingDistributionBucket(rating: number) {
  return Math.min(10, Math.max(1, Math.round(rating))) - 1;
}

function rebuildRatingAggregates(
  gameRatings: Record<string, StoredGameRating>,
): Record<string, GameRatingAggregate> {
  const byAppId = new Map<
    number,
    {
      gameName: string;
      ratings: StoredGameRating[];
    }
  >();

  for (const rating of Object.values(gameRatings)) {
    const entry = byAppId.get(rating.appId);
    byAppId.set(rating.appId, {
      gameName: entry?.gameName ?? `Steam App ${rating.appId}`,
      ratings: [...(entry?.ratings ?? []), rating],
    });
  }

  return Object.fromEntries(
    Array.from(byAppId.entries()).map(([appId, entry]) => {
      const distribution = Array.from({ length: 10 }, () => 0);
      let ratingSum = 0;
      let totalReviews = 0;

      for (const rating of entry.ratings) {
        ratingSum += rating.rating;
        distribution[ratingDistributionBucket(rating.rating)] += 1;

        if (rating.reviewText) {
          totalReviews += 1;
        }
      }

      const totalRatings = entry.ratings.length;
      const averageRating =
        totalRatings > 0
          ? Math.round((ratingSum / totalRatings) * 10) / 10
          : 0;

      return [
        String(appId),
        {
          appId,
          gameName: entry.gameName,
          averageRating,
          totalRatings,
          totalReviews,
          distribution,
          updatedAt: new Date().toISOString(),
        } satisfies GameRatingAggregate,
      ] as const;
    }),
  );
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
      gameRatings: Object.fromEntries(
        Object.entries(parsed.gameRatings ?? {}).flatMap(([key, rating]) => {
          const normalized = normalizeStoredGameRating(
            rating as Partial<StoredGameRating>,
          );
          return normalized ? [[key, normalized] as const] : [];
        }),
      ),
      helpfulVotes: Object.fromEntries(
        Object.entries(parsed.helpfulVotes ?? {}).flatMap(([key, vote]) => {
          const normalized = normalizeStoredHelpfulVote(
            vote as Partial<StoredHelpfulVote>,
          );
          return normalized ? [[key, normalized] as const] : [];
        }),
      ),
      ratingAggregates: Object.fromEntries(
        Object.entries(parsed.ratingAggregates ?? {}).flatMap(([key, aggregate]) => {
          const normalized = normalizeGameRatingAggregate(
            aggregate as Partial<GameRatingAggregate>,
          );
          return normalized ? [[key, normalized] as const] : [];
        }),
      ),
      ratingSubmissionLogs: Object.fromEntries(
        Object.entries(parsed.ratingSubmissionLogs ?? {}).flatMap(
          ([steamId, log]) => {
            const timestamps = Array.isArray(
              (log as Partial<RatingSubmissionLog>)?.timestamps,
            )
              ? (log as RatingSubmissionLog).timestamps.filter(
                  (timestamp) => typeof timestamp === "string",
                )
              : [];

            return [[steamId, { timestamps }] as const];
          },
        ),
      ),
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

const RATING_SUBMISSION_WINDOW_MS = 60 * 60 * 1000;
const RATING_SUBMISSION_MAX_PER_WINDOW = 10;
const RATING_SUBMISSION_MIN_INTERVAL_MS = 30 * 1000;

function pruneRatingSubmissionLog(log: RatingSubmissionLog) {
  const cutoff = Date.now() - RATING_SUBMISSION_WINDOW_MS;
  return {
    timestamps: log.timestamps.filter(
      (timestamp) => Date.parse(timestamp) >= cutoff,
    ),
  };
}

export function assertRatingSubmissionAllowed(log: RatingSubmissionLog) {
  const pruned = pruneRatingSubmissionLog(log);
  const now = Date.now();

  if (pruned.timestamps.length >= RATING_SUBMISSION_MAX_PER_WINDOW) {
    throw new Error("RATE_LIMIT_HOURLY");
  }

  const lastTimestamp = pruned.timestamps.at(-1);
  if (
    lastTimestamp &&
    now - Date.parse(lastTimestamp) < RATING_SUBMISSION_MIN_INTERVAL_MS
  ) {
    throw new Error("RATE_LIMIT_INTERVAL");
  }
}

export async function upsertGameRating(input: {
  steamId: string;
  appId: number;
  rating: number;
  reviewText: string | null;
  gameName?: string;
}) {
  await withDbLock(async () => {
    const db = await readDbFile();
    const normalizedRating = normalizeRatingValue(input.rating);

    if (normalizedRating === null) {
      throw new Error("INVALID_RATING");
    }

    const submissionLog = pruneRatingSubmissionLog(
      db.ratingSubmissionLogs[input.steamId] ?? { timestamps: [] },
    );
    assertRatingSubmissionAllowed(submissionLog);

    const now = new Date().toISOString();
    const ratingKey = createGameRatingKey(input.steamId, input.appId);
    const existing = db.gameRatings[ratingKey];
    const reviewText =
      typeof input.reviewText === "string" && input.reviewText.length > 0
        ? input.reviewText
        : null;
    const reviewChanged =
      existing &&
      reviewText !== null &&
      existing.reviewText !== reviewText;

    db.gameRatings[ratingKey] = {
      steamId: input.steamId,
      appId: input.appId,
      rating: normalizedRating,
      reviewText,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      editedAt: reviewChanged ? now : (existing?.editedAt ?? null),
    };

    db.ratingSubmissionLogs[input.steamId] = {
      timestamps: [...submissionLog.timestamps, now],
    };

    const previousName = db.ratingAggregates[String(input.appId)]?.gameName;
    db.ratingAggregates = rebuildRatingAggregates(db.gameRatings);

    const aggregate = db.ratingAggregates[String(input.appId)];
    if (aggregate) {
      db.ratingAggregates[String(input.appId)] = {
        ...aggregate,
        gameName: input.gameName ?? previousName ?? aggregate.gameName,
      };
    }

    await writeDbFile(db);
  });
}

export async function deleteGameRating(steamId: string, appId: number) {
  await withDbLock(async () => {
    const db = await readDbFile();
    const ratingKey = createGameRatingKey(steamId, appId);
    delete db.gameRatings[ratingKey];

    for (const voteKey of Object.keys(db.helpfulVotes)) {
      if (db.helpfulVotes[voteKey]?.ratingKey === ratingKey) {
        delete db.helpfulVotes[voteKey];
      }
    }

    db.ratingAggregates = rebuildRatingAggregates(db.gameRatings);
    await writeDbFile(db);
  });
}

export async function markReviewHelpful(voterSteamId: string, ratingKey: string) {
  await withDbLock(async () => {
    const db = await readDbFile();

    if (!db.gameRatings[ratingKey]) {
      throw new Error("RATING_NOT_FOUND");
    }

    const voteKey = createHelpfulVoteKey(voterSteamId, ratingKey);
    if (db.helpfulVotes[voteKey]) {
      throw new Error("ALREADY_VOTED");
    }

    db.helpfulVotes[voteKey] = {
      ratingKey,
      voterSteamId,
      createdAt: new Date().toISOString(),
    };

    await writeDbFile(db);
  });
}

export async function getGameRating(
  steamId: string,
  appId: number,
): Promise<StoredGameRating | null> {
  const db = await readDbFile();
  return db.gameRatings[createGameRatingKey(steamId, appId)] ?? null;
}

export async function getGameRatingAggregate(
  appId: number,
): Promise<GameRatingAggregate | null> {
  const db = await readDbFile();
  return db.ratingAggregates[String(appId)] ?? null;
}

export async function getAllRatingAggregates(): Promise<GameRatingAggregate[]> {
  const db = await readDbFile();
  return Object.values(db.ratingAggregates);
}

export async function getGameRatingsForApp(
  appId: number,
): Promise<StoredGameRating[]> {
  const db = await readDbFile();
  return Object.values(db.gameRatings).filter((rating) => rating.appId === appId);
}

export async function getUserGameRatings(
  steamId: string,
): Promise<StoredGameRating[]> {
  const db = await readDbFile();
  return Object.values(db.gameRatings).filter(
    (rating) => rating.steamId === steamId,
  );
}

export async function getHelpfulVoteCounts(
  ratingKeys: string[],
): Promise<Record<string, number>> {
  const db = await readDbFile();
  const counts = Object.fromEntries(ratingKeys.map((key) => [key, 0]));

  for (const vote of Object.values(db.helpfulVotes)) {
    if (counts[vote.ratingKey] !== undefined) {
      counts[vote.ratingKey] += 1;
    }
  }

  return counts;
}

export async function getUserHelpfulVotes(
  voterSteamId: string,
  ratingKeys: string[],
): Promise<Set<string>> {
  const db = await readDbFile();
  const voted = new Set<string>();

  for (const ratingKey of ratingKeys) {
    const voteKey = createHelpfulVoteKey(voterSteamId, ratingKey);
    if (db.helpfulVotes[voteKey]) {
      voted.add(ratingKey);
    }
  }

  return voted;
}

export async function getLatestGameReviewWithText(): Promise<StoredGameRating | null> {
  const db = await readDbFile();

  return (
    Object.values(db.gameRatings)
      .filter(
        (rating) =>
          typeof rating.reviewText === "string" &&
          rating.reviewText.trim().length > 0,
      )
      .sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt))[0] ??
    null
  );
}
