import "server-only";

import { attachGameDisplay } from "@/lib/game-display/attach";
import type { SteamGameImageVariant } from "@/lib/game-display/types";

export async function attachResolvedGameImages<
  T extends {
    appId: number;
  },
>(entries: T[], options?: { variant?: SteamGameImageVariant }) {
  const enriched = await attachGameDisplay(entries, {
    imageVariant: options?.variant,
  });

  return enriched.map(
    ({
      imageCandidates,
      imageUrl,
      headerImageCandidates,
      capsuleImageCandidates,
      gameName,
      slug,
      ...entry
    }) => ({
      ...entry,
      imageCandidates,
      imageUrl,
    }),
  );
}
