import "server-only";

import type { SteamProfile } from "@/lib/auth/steam";
import { getSteamProfile, getSteamProfiles } from "@/lib/auth/steam";
import {
  getStatRealmUser,
  upsertStatRealmUser,
} from "@/lib/db";
import type { StatRealmUser } from "@/lib/db/types";
import { createEmptyUserStats } from "@/lib/user/synced-statistics";

const STEAM_ID_ONLY_PATTERN = /^\d{17}$/;
const FALLBACK_DISPLAY_NAME = "Steam Player";

export type StoredSteamProfileFields = {
  displayName: string;
  avatar: string;
  avatarMedium: string;
  avatarUrl: string;
  profileUrl: string;
  countryCode: string | null;
};

export function isSteamIdLike(value: string | undefined | null) {
  return Boolean(value && STEAM_ID_ONLY_PATTERN.test(value));
}

export function resolveUserDisplayName(user: StatRealmUser) {
  const displayName = user.displayName?.trim();

  if (
    displayName &&
    displayName !== user.steamId &&
    !isSteamIdLike(displayName)
  ) {
    return displayName;
  }

  return FALLBACK_DISPLAY_NAME;
}

export function resolveUserAvatarUrl(user: StatRealmUser) {
  return user.avatarUrl || user.avatarMedium || user.avatar || "";
}

export function steamProfileToStoredFields(
  profile: SteamProfile,
): StoredSteamProfileFields {
  return {
    displayName: profile.personaname,
    avatar: profile.avatar,
    avatarMedium: profile.avatarmedium,
    avatarUrl: profile.avatarfull,
    profileUrl: profile.profileurl,
    countryCode: profile.loccountrycode ?? null,
  };
}

export function userNeedsProfileRefresh(user: StatRealmUser) {
  const displayName = user.displayName?.trim();
  const avatarUrl = resolveUserAvatarUrl(user);

  return (
    !displayName ||
    displayName === user.steamId ||
    isSteamIdLike(displayName) ||
    !avatarUrl
  );
}

async function applySteamProfileToDatabase(
  steamId: string,
  profile: SteamProfile,
) {
  const fields = steamProfileToStoredFields(profile);
  const existingUser = await getStatRealmUser(steamId);

  await upsertStatRealmUser({
    steamId,
    displayName: fields.displayName,
    avatar: fields.avatar,
    avatarMedium: fields.avatarMedium,
    avatarUrl: fields.avatarUrl,
    profileUrl: fields.profileUrl,
    stats: {
      ...(existingUser?.stats ?? createEmptyUserStats()),
      countryCode: fields.countryCode,
    },
  });
}

export async function refreshSteamProfilesFromApi(steamIds: string[]) {
  const staleSteamIds = [
    ...new Set(steamIds.filter((steamId) => isSteamIdLike(steamId))),
  ];

  if (staleSteamIds.length === 0) {
    return;
  }

  const profiles = await getSteamProfiles(staleSteamIds);

  await Promise.all(
    staleSteamIds.map(async (steamId) => {
      const profile = profiles.get(steamId);

      if (!profile) {
        console.warn("[StatRealm] Steam profile missing during refresh", {
          steamId,
        });
        return;
      }

      await applySteamProfileToDatabase(steamId, profile);
    }),
  );
}

export async function syncSteamUserProfile(steamId: string) {
  const profile = await getSteamProfile(steamId);
  await applySteamProfileToDatabase(steamId, profile);
  return profile;
}

export async function ensureStatRealmUserProfileFresh(
  steamId: string,
): Promise<StatRealmUser | null> {
  const user = await getStatRealmUser(steamId);

  if (!user) {
    return null;
  }

  if (!userNeedsProfileRefresh(user)) {
    return user;
  }

  await refreshSteamProfilesFromApi([steamId]);
  return getStatRealmUser(steamId);
}

export async function ensureStatRealmUsersHaveFreshProfiles(
  users: StatRealmUser[],
): Promise<StatRealmUser[]> {
  const staleSteamIds = users
    .filter(userNeedsProfileRefresh)
    .map((user) => user.steamId);

  if (staleSteamIds.length === 0) {
    return users;
  }

  await refreshSteamProfilesFromApi(staleSteamIds);

  const refreshedUsers = await Promise.all(
    users.map(async (user) => {
      if (!staleSteamIds.includes(user.steamId)) {
        return user;
      }

      return (await getStatRealmUser(user.steamId)) ?? user;
    }),
  );

  return refreshedUsers;
}
