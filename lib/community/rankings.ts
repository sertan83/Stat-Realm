import "server-only";

import {
  getAllStatRealmUsers,
  getRegisteredUserCount,
  readCommunityAggregates,
} from "@/lib/db";
import {
  ensureStatRealmUsersHaveFreshProfiles,
  resolveUserAvatarUrl,
  resolveUserDisplayName,
} from "@/lib/steam/profile-sync";

export type CommunityLeaderboardPlayer = {
  rank: number;
  steamId: string;
  username: string;
  avatarUrl: string;
  hoursPlayed: number;
};

export async function getCommunityRankings() {
  const aggregates = await readCommunityAggregates();

  return {
    mostPlayedGames: aggregates.mostPlayed.map((game) => game.name),
    mostOwnedGames: aggregates.mostOwned.map((game) => game.name),
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
  const [aggregates, registeredUserCount, communityLeaderboard] =
    await Promise.all([
      readCommunityAggregates(),
      getRegisteredUserCount(),
      getTopCommunityLeaderboardPlayers(3),
    ]);

  return {
    mostPlayedGames: aggregates.mostPlayed.map((game) => game.name),
    mostOwnedGames: aggregates.mostOwned.map((game) => game.name),
    registeredUserCount,
    communityLeaderboard,
  };
}
