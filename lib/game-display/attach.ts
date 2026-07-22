import "server-only";

import { GAME_LIST_IMAGE_VARIANT } from "@/lib/game-display/constants";
import {
  resolveGameDisplayBatch,
  type GameDisplay,
} from "@/lib/game-display/resolve";
import type { SteamGameImageVariant } from "@/lib/game-display/types";
import { DEFAULT_GAME_FALLBACK_IMAGE } from "@/lib/steam/image-constants";

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

  const variant = options?.imageVariant ?? GAME_LIST_IMAGE_VARIANT;
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
        imageUrl: DEFAULT_GAME_FALLBACK_IMAGE,
        imageCandidates: [DEFAULT_GAME_FALLBACK_IMAGE],
        headerImageCandidates: [DEFAULT_GAME_FALLBACK_IMAGE],
        capsuleImageCandidates: [DEFAULT_GAME_FALLBACK_IMAGE],
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
