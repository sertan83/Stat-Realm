import "server-only";

import { getAllStatRealmUsers, getStatRealmUser } from "@/lib/db";
import {
  getPublicSteamFriends,
  type PublicSteamFriend,
  type SteamFriendListStatus,
} from "@/lib/steam/friends";

export type PublicProfileFriend = PublicSteamFriend & {
  hasStatRealmProfile: boolean;
};

export type PublicProfileFriendsResult = {
  status: SteamFriendListStatus;
  friends: PublicProfileFriend[];
};

export async function loadPublicProfileFriends(
  steamId: string,
): Promise<PublicProfileFriendsResult> {
  const owner = await getStatRealmUser(steamId);

  if (!owner) {
    return { status: "unavailable", friends: [] };
  }

  const { status, friends } = await getPublicSteamFriends(steamId);
  const statRealmSteamIds = new Set(
    (await getAllStatRealmUsers()).map((user) => user.steamId),
  );

  return {
    status,
    friends: friends.map((friend) => ({
      ...friend,
      hasStatRealmProfile: statRealmSteamIds.has(friend.steamId),
    })),
  };
}
