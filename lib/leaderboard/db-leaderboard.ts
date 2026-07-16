import "server-only";

import { getAllUsersWithLibraries } from "@/lib/db";
import { ensureStatRealmUsersHaveFreshProfiles } from "@/lib/steam/profile-sync";
import {
  buildLeaderboardIdentityFromUser,
  buildSteamLeaderboardGamesFromLibrary,
  buildSyncedLeaderboardStats,
} from "@/lib/user/synced-statistics";
import type { DbLeaderboardEntry } from "@/types/leaderboard";

export type { DbLeaderboardEntry };

export async function getDbLeaderboardEntries(options: {
  catalogAliasesByAppId?: Map<number, string[]>;
  catalogCategoriesByAppId?: Map<number, string>;
} = {}): Promise<DbLeaderboardEntry[]> {
  const { users, libraries } = await getAllUsersWithLibraries();
  const refreshedUsers = await ensureStatRealmUsersHaveFreshProfiles(users);

  return refreshedUsers.map((user) => ({
    identity: buildLeaderboardIdentityFromUser(user),
    steamGames: buildSteamLeaderboardGamesFromLibrary(
      libraries[user.steamId] ?? [],
      options,
    ),
    syncedStats: buildSyncedLeaderboardStats(user),
  }));
}
