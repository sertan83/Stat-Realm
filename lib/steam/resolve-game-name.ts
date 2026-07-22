import "server-only";

import {
  getAllUsersWithLibraries,
  getGameRatingAggregate,
  getUserLibrary,
  readCommunityAggregates,
} from "@/lib/db";
import { findSteamAppBySlug, getSteamAppList } from "@/lib/steam/app-list";
import { getCachedStoreAppRecord } from "@/lib/steam/store-app-cache";
import { getSteamStoreAppDetails } from "@/lib/steam/store-app-details";

function isPlaceholderGameName(name: string, appId: number) {
  const trimmed = name.trim();

  return trimmed.length === 0 || trimmed === `Steam App ${appId}`;
}

function readNameFromStoreData(data: Record<string, unknown> | null | undefined) {
  if (!data) {
    return null;
  }

  const name = typeof data.name === "string" ? data.name.trim() : "";

  return name.length > 0 ? name : null;
}

async function findGameNameInSyncedLibraries(appId: number) {
  const { libraries } = await getAllUsersWithLibraries();

  for (const library of Object.values(libraries)) {
    const game = library.find((entry) => entry.appId === appId);

    if (game?.name && !isPlaceholderGameName(game.name, appId)) {
      return game.name;
    }
  }

  return null;
}

async function findGameNameInCommunityAggregates(appId: number) {
  const aggregates = await readCommunityAggregates();

  for (const game of [...aggregates.mostPlayed, ...aggregates.mostOwned]) {
    if (game.appId === appId && !isPlaceholderGameName(game.name, appId)) {
      return game.name;
    }
  }

  return null;
}

async function findGameNameInSteamAppList(appId: number) {
  await getSteamAppList().catch(() => []);
  const match = await findSteamAppBySlug(String(appId));

  if (match?.name && !isPlaceholderGameName(match.name, appId)) {
    return match.name;
  }

  return null;
}

export async function resolveSteamGameDisplayName(
  appId: number,
  options?: { steamId?: string | null },
): Promise<string> {
  const aggregate = await getGameRatingAggregate(appId);

  if (aggregate?.gameName && !isPlaceholderGameName(aggregate.gameName, appId)) {
    return aggregate.gameName;
  }

  if (options?.steamId) {
    const library = await getUserLibrary(options.steamId);
    const ownedGame = library.find((game) => game.appId === appId);

    if (ownedGame?.name && !isPlaceholderGameName(ownedGame.name, appId)) {
      return ownedGame.name;
    }
  }

  const syncedLibraryName = await findGameNameInSyncedLibraries(appId);
  if (syncedLibraryName) {
    return syncedLibraryName;
  }

  const aggregateName = await findGameNameInCommunityAggregates(appId);
  if (aggregateName) {
    return aggregateName;
  }

  const cachedStoreApp = getCachedStoreAppRecord(appId);
  const cachedName = readNameFromStoreData(cachedStoreApp?.data ?? null);

  if (cachedName && !isPlaceholderGameName(cachedName, appId)) {
    return cachedName;
  }

  const storeDetails = await getSteamStoreAppDetails(appId);

  if (!isPlaceholderGameName(storeDetails.name, appId)) {
    return storeDetails.name;
  }

  const appListName = await findGameNameInSteamAppList(appId);
  if (appListName) {
    return appListName;
  }

  return "Unknown Game";
}
