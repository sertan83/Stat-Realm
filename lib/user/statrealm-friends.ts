import "server-only";

import { getAllStatRealmUsers } from "@/lib/db";
import {
  getSteamFriendSummaries,
  getSteamFriendsList,
  type PublicSteamFriend,
  type SteamFriendListStatus,
  type SteamFriendPresenceStatus,
} from "@/lib/steam/friends";
import {
  resolveUserAvatarUrl,
  resolveUserDisplayName,
} from "@/lib/steam/profile-sync";
import { normalizeUserStats } from "@/lib/user/synced-statistics";

export type StatRealmFriend = {
  steamId: string;
  personaName: string;
  avatarUrl: string;
  steamLevel: number | null;
  status: SteamFriendPresenceStatus;
  currentGame: string | null;
  totalPlaytimeMinutes: number;
};

export type StatRealmFriendsResult = {
  status: SteamFriendListStatus;
  friends: StatRealmFriend[];
};

function buildFriendFromSources(
  steamId: string,
  summary: PublicSteamFriend | undefined,
  dbUser: Awaited<ReturnType<typeof getAllStatRealmUsers>>[number],
): StatRealmFriend {
  const stats = normalizeUserStats(dbUser.stats);

  return {
    steamId,
    personaName: summary?.personaName ?? resolveUserDisplayName(dbUser),
    avatarUrl: summary?.avatarUrl ?? resolveUserAvatarUrl(dbUser),
    steamLevel: summary?.steamLevel ?? stats.steamLevel,
    status: summary?.status ?? "offline",
    currentGame: summary?.currentGame ?? null,
    totalPlaytimeMinutes: stats.totalPlaytimeMinutes,
  };
}

export async function loadStatRealmFriendsForUser(
  steamId: string,
): Promise<StatRealmFriendsResult> {
  const [friendList, statRealmUsers] = await Promise.all([
    getSteamFriendsList(steamId),
    getAllStatRealmUsers(),
  ]);

  if (friendList.status !== "available") {
    return { status: friendList.status, friends: [] };
  }

  const statRealmUsersById = new Map(
    statRealmUsers.map((user) => [user.steamId, user]),
  );
  const statRealmFriendIds = friendList.steamIds.filter((friendSteamId) =>
    statRealmUsersById.has(friendSteamId),
  );

  if (statRealmFriendIds.length === 0) {
    return { status: "available", friends: [] };
  }

  const summaries = await getSteamFriendSummaries(statRealmFriendIds);
  const summariesById = new Map(
    summaries.map((summary) => [summary.steamId, summary]),
  );

  const friends = statRealmFriendIds
    .map((friendSteamId) =>
      buildFriendFromSources(
        friendSteamId,
        summariesById.get(friendSteamId),
        statRealmUsersById.get(friendSteamId)!,
      ),
    )
    .sort((left, right) =>
      left.personaName.localeCompare(right.personaName, undefined, {
        sensitivity: "base",
      }),
    );

  return {
    status: "available",
    friends,
  };
}
