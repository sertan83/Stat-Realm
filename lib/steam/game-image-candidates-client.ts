import type { SteamGameImageVariant } from "@/lib/steam/game-image-urls";
import { buildSteamGameImageCandidateUrls } from "@/lib/steam/game-image-urls";

export type { SteamGameImageVariant } from "@/lib/steam/game-image-urls";

export function buildSteamGameImageCandidates(
  appId: number,
  options?: {
    variant?: SteamGameImageVariant;
    preferredUrls?: Array<string | null | undefined>;
    capsuleFilename?: string | null;
    storedImageUrls?: string[];
  },
): string[] {
  return buildSteamGameImageCandidateUrls(appId, options);
}
