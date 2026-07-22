import "server-only";

import {
  getAllUsersWithLibraries,
  getGameRatingAggregate,
  getStoredGameMetadata,
  getUserLibrary,
  readCommunityAggregates,
  upsertStoredGameMetadata,
} from "@/lib/db";
import {
  GAME_NAME_LOADING_LABEL,
  isPlaceholderGameName,
} from "@/lib/game-metadata/constants";
import { findSteamAppBySlug, getSteamAppList } from "@/lib/steam/app-list";
import { getCachedStoreAppRecord } from "@/lib/steam/store-app-cache";
import { getSteamStoreAppDetails } from "@/lib/steam/store-app-details";

export {
  GAME_NAME_LOADING_LABEL,
  isPlaceholderGameName,
} from "@/lib/game-metadata/constants";

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

async function persistResolvedGameName(appId: number, name: string) {
  if (isPlaceholderGameName(name, appId)) {
    return;
  }

  await upsertStoredGameMetadata(appId, name);
}

export async function resolveGameMetadata(
  appId: number,
  options?: {
    steamId?: string | null;
    persist?: boolean;
  },
): Promise<{ appId: number; name: string }> {
  const persist = options?.persist ?? true;

  const storedMetadata = await getStoredGameMetadata(appId);
  if (
    storedMetadata?.name &&
    !isPlaceholderGameName(storedMetadata.name, appId)
  ) {
    return { appId, name: storedMetadata.name };
  }

  const aggregate = await getGameRatingAggregate(appId);
  if (aggregate?.gameName && !isPlaceholderGameName(aggregate.gameName, appId)) {
    if (persist) {
      await persistResolvedGameName(appId, aggregate.gameName);
    }

    return { appId, name: aggregate.gameName };
  }

  if (options?.steamId) {
    const library = await getUserLibrary(options.steamId);
    const ownedGame = library.find((game) => game.appId === appId);

    if (ownedGame?.name && !isPlaceholderGameName(ownedGame.name, appId)) {
      if (persist) {
        await persistResolvedGameName(appId, ownedGame.name);
      }

      return { appId, name: ownedGame.name };
    }
  }

  const syncedLibraryName = await findGameNameInSyncedLibraries(appId);
  if (syncedLibraryName) {
    if (persist) {
      await persistResolvedGameName(appId, syncedLibraryName);
    }

    return { appId, name: syncedLibraryName };
  }

  const aggregateName = await findGameNameInCommunityAggregates(appId);
  if (aggregateName) {
    if (persist) {
      await persistResolvedGameName(appId, aggregateName);
    }

    return { appId, name: aggregateName };
  }

  const cachedStoreApp = getCachedStoreAppRecord(appId);
  const cachedName = readNameFromStoreData(cachedStoreApp?.data ?? null);

  if (cachedName && !isPlaceholderGameName(cachedName, appId)) {
    if (persist) {
      await persistResolvedGameName(appId, cachedName);
    }

    return { appId, name: cachedName };
  }

  const storeDetails = await getSteamStoreAppDetails(appId);

  if (!isPlaceholderGameName(storeDetails.name, appId)) {
    if (persist) {
      await persistResolvedGameName(appId, storeDetails.name);
    }

    return { appId, name: storeDetails.name };
  }

  const appListName = await findGameNameInSteamAppList(appId);
  if (appListName) {
    if (persist) {
      await persistResolvedGameName(appId, appListName);
    }

    return { appId, name: appListName };
  }

  return { appId, name: GAME_NAME_LOADING_LABEL };
}

export async function resolveGameMetadataBatch(
  appIds: number[],
  options?: {
    steamId?: string | null;
    persist?: boolean;
  },
): Promise<Map<number, string>> {
  const uniqueAppIds = [...new Set(appIds)];
  const entries = await Promise.all(
    uniqueAppIds.map(async (appId) => {
      const metadata = await resolveGameMetadata(appId, options);
      return [appId, metadata.name] as const;
    }),
  );

  return new Map(entries);
}

export async function resolveGameDisplayName(
  appId: number,
  options?: {
    steamId?: string | null;
    persist?: boolean;
  },
): Promise<string> {
  const metadata = await resolveGameMetadata(appId, options);
  return metadata.name;
}
