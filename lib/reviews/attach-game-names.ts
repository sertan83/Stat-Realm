import "server-only";

import { attachGameDisplay } from "@/lib/game-display/attach";

export async function attachResolvedGameNames<
  T extends {
    appId: number;
    gameName?: string;
  },
>(entries: T[], options?: { steamId?: string | null }) {
  const enriched = await attachGameDisplay(entries, options);

  return enriched.map(
    ({
      gameName,
      imageCandidates,
      imageUrl,
      slug,
      headerImageCandidates,
      capsuleImageCandidates,
      ...entry
    }) => ({
      ...entry,
      gameName,
    }),
  );
}
