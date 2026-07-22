import "server-only";

import { attachGameListDisplay } from "@/lib/game-display/game-list";

export async function attachResolvedGameNames<
  T extends {
    appId: number;
    gameName?: string;
  },
>(entries: T[], options?: { steamId?: string | null }) {
  const enriched = await attachGameListDisplay(entries, options);

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
