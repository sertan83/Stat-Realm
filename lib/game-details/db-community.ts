import "server-only";

import { getAllUsersWithLibraries } from "@/lib/db";
import {
  ensureStatRealmUsersHaveFreshProfiles,
  resolveUserAvatarUrl,
  resolveUserDisplayName,
} from "@/lib/steam/profile-sync";
import { formatPlaytimeMinutes } from "@/lib/i18n/formatters";
import {
  countryCodeToFlag,
  getCountryDisplay,
} from "@/lib/user/country";
import type { GameUserPosition, LeaderboardPlayer } from "@/types/game-details";

export type GameDbCommunitySnapshot = {
  ownerCount: number;
  averagePlaytimeMinutes: number | null;
  averageCompletion: number | null;
  perfectGamesCount: number;
  leaderboard: LeaderboardPlayer[];
};

function buildInitials(username: string) {
  return (
    username
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "SR"
  );
}

type GameOwnerEntry = {
  steamId: string;
  username: string;
  avatarUrl?: string;
  playtimeMinutes: number;
  completionPercentage: number | null;
  achievementsUnlocked: number | null;
  achievementsTotal: number | null;
  perfectGame: boolean | null;
  steamLevel: number | null;
  countryCode: string | null;
};

function buildGameOwners(
  appId: number,
  libraries: Awaited<ReturnType<typeof getAllUsersWithLibraries>>["libraries"],
  refreshedUsers: Awaited<ReturnType<typeof ensureStatRealmUsersHaveFreshProfiles>>,
): GameOwnerEntry[] {
  const usersBySteamId = new Map(
    refreshedUsers.map((user) => [user.steamId, user]),
  );

  return Object.entries(libraries).flatMap(([steamId, library]) => {
    const game = library.find((entry) => entry.appId === appId);

    if (!game) {
      return [];
    }

    const user = usersBySteamId.get(steamId);

    return [
      {
        steamId,
        username: user ? resolveUserDisplayName(user) : "Steam Player",
        avatarUrl: user ? resolveUserAvatarUrl(user) || undefined : undefined,
        playtimeMinutes: game.playtimeMinutes,
        completionPercentage: game.completionPercentage,
        achievementsUnlocked: game.achievementsUnlocked,
        achievementsTotal: game.achievementsTotal,
        perfectGame: game.perfectGame,
        steamLevel: user?.stats.steamLevel ?? null,
        countryCode: user?.stats.countryCode ?? null,
      },
    ];
  });
}

export async function getGameDbCommunitySnapshot(
  appId: number,
  options: {
    unavailable?: string;
    formatPlaytime?: (minutes: number) => string;
  } = {},
): Promise<GameDbCommunitySnapshot> {
  const unavailable = options.unavailable ?? "Unavailable";
  const formatPlaytime = options.formatPlaytime ?? formatPlaytimeMinutes;
  const { users, libraries } = await getAllUsersWithLibraries();
  const refreshedUsers = await ensureStatRealmUsersHaveFreshProfiles(users);

  const owners = buildGameOwners(appId, libraries, refreshedUsers);

  const ownerCount = owners.length;
  const totalPlaytimeMinutes = owners.reduce(
    (total, owner) => total + owner.playtimeMinutes,
    0,
  );
  const averagePlaytimeMinutes =
    ownerCount > 0 ? totalPlaytimeMinutes / ownerCount : null;

  const ownersWithCompletion = owners.filter(
    (owner) => owner.completionPercentage !== null,
  );
  const averageCompletion =
    ownersWithCompletion.length > 0
      ? ownersWithCompletion.reduce(
          (total, owner) => total + (owner.completionPercentage ?? 0),
          0,
        ) / ownersWithCompletion.length
      : null;

  const perfectGamesCount = owners.filter(
    (owner) => owner.perfectGame === true,
  ).length;

  const leaderboard = [...owners]
    .sort((left, right) => right.playtimeMinutes - left.playtimeMinutes)
    .map((owner, index) => ({
      rank: index + 1,
      steamId: owner.steamId,
      username: owner.username,
      initials: buildInitials(owner.username),
      avatarUrl: owner.avatarUrl,
      hoursPlayed: formatPlaytime(owner.playtimeMinutes),
      completion:
        owner.completionPercentage !== null
          ? `${owner.completionPercentage}%`
          : unavailable,
      fastestCompletion: unavailable,
    }));

  return {
    ownerCount,
    averagePlaytimeMinutes,
    averageCompletion,
    perfectGamesCount,
    leaderboard,
  };
}

export async function getUserGamePosition(
  appId: number,
  steamId: string,
  options: {
    formatPlaytime?: (minutes: number) => string;
  } = {},
): Promise<GameUserPosition | null> {
  const formatPlaytime = options.formatPlaytime ?? formatPlaytimeMinutes;
  const { users, libraries } = await getAllUsersWithLibraries();
  const refreshedUsers = await ensureStatRealmUsersHaveFreshProfiles(users);
  const owners = buildGameOwners(appId, libraries, refreshedUsers);
  const userEntry = owners.find((owner) => owner.steamId === steamId);

  if (!userEntry) {
    return null;
  }

  const sortedOwners = [...owners].sort(
    (left, right) => right.playtimeMinutes - left.playtimeMinutes,
  );
  const rank = sortedOwners.findIndex((owner) => owner.steamId === steamId) + 1;

  return {
    rank,
    steamId: userEntry.steamId,
    username: userEntry.username,
    initials: buildInitials(userEntry.username),
    avatarUrl: userEntry.avatarUrl,
    playtime: formatPlaytime(userEntry.playtimeMinutes),
    completionPercentage: userEntry.completionPercentage,
    achievementsUnlocked: userEntry.achievementsUnlocked,
    achievementsTotal: userEntry.achievementsTotal,
    perfectGame: userEntry.perfectGame,
    steamLevel: userEntry.steamLevel,
    country: getCountryDisplay(userEntry.countryCode),
    countryFlag: countryCodeToFlag(userEntry.countryCode),
  };
}
