import "server-only";

import type { SteamGameImageVariant } from "@/lib/steam/game-image-candidates-client";
import {
  getSteamBannerImageCandidates,
  getSteamExploreCardImageCandidates,
  resolveCapsuleFilenameForApp,
} from "@/lib/steam/game-images";
import { fetchStoreAppData } from "@/lib/steam/store-app-cache";
import type { SteamImageCandidate } from "@/types/steam-images";

export type { SteamGameImageVariant } from "@/lib/steam/game-image-candidates-client";

function sortCapsuleFirst(candidates: SteamImageCandidate[]) {
  const capsulePattern =
    /capsule_231x87|capsule_184x69|capsule_616x353|library_capsule|capsule_image/i;

  return [...candidates].sort((first, second) => {
    const firstScore =
      capsulePattern.test(first.url) || capsulePattern.test(first.label) ? 0 : 1;
    const secondScore =
      capsulePattern.test(second.url) || capsulePattern.test(second.label) ? 0 : 1;

    return firstScore - secondScore;
  });
}

async function readStoreDataForApp(appId: number) {
  const storeApp = await fetchStoreAppData(appId).catch(() => ({
    success: false as const,
    data: null,
    source: "cache" as const,
  }));

  return storeApp.success ? storeApp.data : null;
}

export async function resolveGameImageCandidates(
  appId: number,
  variant: SteamGameImageVariant = "card",
): Promise<string[]> {
  if (!Number.isInteger(appId) || appId <= 0) {
    return [];
  }

  const storeData = await readStoreDataForApp(appId);
  const capsuleFilename = resolveCapsuleFilenameForApp({ storeData });

  if (variant === "header") {
    return getSteamBannerImageCandidates(appId, capsuleFilename, storeData).map(
      (candidate) => candidate.url,
    );
  }

  const candidates = getSteamExploreCardImageCandidates(
    appId,
    capsuleFilename,
    undefined,
    storeData,
  );

  if (variant === "capsule") {
    return sortCapsuleFirst(candidates).map((candidate) => candidate.url);
  }

  return candidates.map((candidate) => candidate.url);
}

export async function resolveGameImageCandidatesBatch(
  appIds: number[],
  variant: SteamGameImageVariant = "card",
): Promise<Map<number, string[]>> {
  const uniqueAppIds = [...new Set(appIds)];

  const entries = await Promise.all(
    uniqueAppIds.map(async (appId) => {
      const candidates = await resolveGameImageCandidates(appId, variant);
      return [appId, candidates] as const;
    }),
  );

  return new Map(entries);
}
