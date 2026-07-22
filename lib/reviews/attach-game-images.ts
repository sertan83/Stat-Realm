import "server-only";

import type { SteamGameImageVariant } from "@/lib/steam/resolve-game-images";
import { resolveGameImageCandidatesBatch } from "@/lib/steam/resolve-game-images";

export async function attachResolvedGameImages<
  T extends {
    appId: number;
  },
>(entries: T[], options?: { variant?: SteamGameImageVariant }) {
  if (entries.length === 0) {
    return [];
  }

  const variant = options?.variant ?? "card";
  const imageCandidatesByAppId = await resolveGameImageCandidatesBatch(
    entries.map((entry) => entry.appId),
    variant,
  );

  return entries.map((entry) => ({
    ...entry,
    imageCandidates: imageCandidatesByAppId.get(entry.appId) ?? [],
  }));
}
