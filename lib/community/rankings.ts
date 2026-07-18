import "server-only";

import { getSteamProfiles } from "@/lib/auth/steam";
import {
  getAllStatRealmUsers,
  getMostRecentLoggedInUser,
  getRegisteredUserCount,
  readCommunityAggregates,
} from "@/lib/db";
import {
  ensureStatRealmUserProfileFresh,
  ensureStatRealmUsersHaveFreshProfiles,
  resolveUserAvatarUrl,
  resolveUserDisplayName,
} from "@/lib/steam/profile-sync";
import {
  getLatestLandingReview,
  type LandingLatestReview,
} from "@/lib/reviews/latest-review";

export type { LandingLatestReview } from "@/lib/reviews/latest-review";

export type CommunityLeaderboardPlayer = {
  rank: number;
  steamId: string;
  username: string;
  avatarUrl: string;
  hoursPlayed: number;
};

export type LandingRecentPlayer = {
  steamId: string;
  username: string;
  avatarUrl: string;
  lastLoginAt: string;
  steamLevel: number | null;
  totalPlaytimeMinutes: number;
  isOnline: boolean;
};

export async function getCommunityRankings() {
  const aggregates = await readCommunityAggregates();

  return {
    mostPlayedGames: aggregates.mostPlayed.map((game) => game.name),
    mostOwnedGames: aggregates.mostOwned.map((game) => game.name),
  };
}

export async function getMostRecentLoggedInPlayer(): Promise<LandingRecentPlayer | null> {
  const mostRecentUser = await getMostRecentLoggedInUser();

  if (!mostRecentUser?.lastLoginAt) {
    return null;
  }

  const user =
    (await ensureStatRealmUserProfileFresh(mostRecentUser.steamId)) ??
    mostRecentUser;

  if (!user.lastLoginAt) {
    return null;
  }

  let isOnline = false;

  try {
    const profiles = await getSteamProfiles([user.steamId]);
    const profile = profiles.get(user.steamId);
    isOnline = (profile?.personastate ?? 0) > 0;
  } catch {
    isOnline = false;
  }

  return {
    steamId: user.steamId,
    username: resolveUserDisplayName(user),
    avatarUrl: resolveUserAvatarUrl(user),
    lastLoginAt: user.lastLoginAt,
    steamLevel: user.stats.steamLevel,
    totalPlaytimeMinutes: user.stats.totalPlaytimeMinutes,
    isOnline,
  };
}

export async function getTopCommunityLeaderboardPlayers(
  limit: number,
): Promise<CommunityLeaderboardPlayer[]> {
  const users = await ensureStatRealmUsersHaveFreshProfiles(
    await getAllStatRealmUsers(),
  );

  return users
    .map((user) => {
      const stats = user.stats;

      return {
        steamId: user.steamId,
        username: resolveUserDisplayName(user),
        avatarUrl: resolveUserAvatarUrl(user),
        totalPlaytimeMinutes: stats.totalPlaytimeMinutes,
      };
    })
    .sort((a, b) => b.totalPlaytimeMinutes - a.totalPlaytimeMinutes)
    .slice(0, limit)
    .map((user, index) => ({
      rank: index + 1,
      steamId: user.steamId,
      username: user.username,
      avatarUrl: user.avatarUrl,
      hoursPlayed:
        user.totalPlaytimeMinutes > 0
          ? Math.round((user.totalPlaytimeMinutes / 60) * 10) / 10
          : 0,
    }));
}

export async function getCommunityLandingData() {
  const [
    aggregates,
    registeredUserCount,
    communityLeaderboard,
    recentPlayer,
    latestReview,
  ] = await Promise.all([
    readCommunityAggregates(),
    getRegisteredUserCount(),
    getTopCommunityLeaderboardPlayers(3),
    getMostRecentLoggedInPlayer(),
    getLatestLandingReview(),
  ]);

  return {
    mostPlayedGames: aggregates.mostPlayed.map((game) => game.name),
    mostOwnedGames: aggregates.mostOwned.map((game) => game.name),
    registeredUserCount,
    communityLeaderboard,
    recentPlayer,
    latestReview,
  };
}
