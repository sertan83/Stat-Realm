import "server-only";

import { attachGameDisplay } from "@/lib/game-display/attach";
import { attachGameListDisplay } from "@/lib/game-display/game-list";
import type { SteamGameImageVariant } from "@/lib/game-display/types";

export async function attachResolvedGameImages<
  T extends {
    appId: number;
  },
>(entries: T[], options?: { variant?: SteamGameImageVariant }) {
  const enriched = options?.variant
    ? await attachGameDisplay(entries, {
        imageVariant: options.variant,
        persist: true,
      })
    : await attachGameListDisplay(entries);

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
