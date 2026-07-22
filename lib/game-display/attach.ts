import "server-only";

import {
  resolveGameDisplayBatch,
  type GameDisplay,
} from "@/lib/game-display/resolve";
import type { SteamGameImageVariant } from "@/lib/game-display/types";

function selectVariantCandidates(
  display: GameDisplay,
  variant: SteamGameImageVariant,
) {
  if (variant === "header") {
    return display.headerImageCandidates;
  }

  if (variant === "capsule") {
    return display.capsuleImageCandidates;
  }

  return display.imageCandidates;
}

export async function attachGameDisplay<
  T extends {
    appId: number;
  },
>(
  entries: T[],
  options?: {
    steamId?: string | null;
    imageVariant?: SteamGameImageVariant;
    persist?: boolean;
  },
) {
  if (entries.length === 0) {
    return [];
  }

  const variant = options?.imageVariant ?? "card";
  const displays = await resolveGameDisplayBatch(
    entries.map((entry) => ({ appId: entry.appId })),
    {
      steamId: options?.steamId,
      imageVariant: variant,
      persist: options?.persist,
    },
  );

  return entries.map((entry) => {
    const display =
      displays.get(entry.appId) ??
      ({
        appId: entry.appId,
        name: "",
        slug: String(entry.appId),
        imageUrl: "",
        imageCandidates: [],
        headerImageCandidates: [],
        capsuleImageCandidates: [],
      } satisfies GameDisplay);

    return {
      ...entry,
      gameName: display.name,
      slug: display.slug,
      imageUrl: display.imageUrl,
      imageCandidates: selectVariantCandidates(display, variant),
      headerImageCandidates: display.headerImageCandidates,
      capsuleImageCandidates: display.capsuleImageCandidates,
    };
  });
}
