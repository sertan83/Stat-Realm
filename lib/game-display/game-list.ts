import "server-only";

import { GAME_LIST_IMAGE_VARIANT } from "@/lib/game-display/constants";
import { attachGameDisplay } from "@/lib/game-display/attach";
import {
  gameDisplayToGame,
  resolveGameDisplayBatch,
} from "@/lib/game-display/resolve";
import type { ResolveGameDisplayInput } from "@/lib/game-display/types";
import { DEFAULT_GAME_FALLBACK_IMAGE } from "@/lib/steam/image-constants";
import type { Game } from "@/types/game";

type GameListDisplayFields = {
  gameName: string;
  slug: string;
  imageUrl: string;
  imageCandidates: string[];
};

export async function attachGameListDisplay<
  T extends {
    appId: number;
  },
>(
  entries: T[],
  options?: {
    steamId?: string | null;
    persist?: boolean;
  },
) {
  return attachGameDisplay(entries, {
    steamId: options?.steamId,
    persist: options?.persist ?? true,
    imageVariant: GAME_LIST_IMAGE_VARIANT,
  });
}

export async function resolveGameListBatch(
  inputs: ResolveGameDisplayInput[],
  options?: {
    steamId?: string | null;
    persist?: boolean;
  },
) {
  return resolveGameDisplayBatch(inputs, {
    steamId: options?.steamId,
    persist: options?.persist ?? true,
    imageVariant: GAME_LIST_IMAGE_VARIANT,
  });
}

export function mapGameListDisplayToGame(
  appId: number,
  display: GameListDisplayFields | undefined,
  fallbacks: { title?: string; category?: string } = {},
): Game {
  return {
    id: String(appId),
    title: display?.gameName || fallbacks.title || "",
    slug: display?.slug || String(appId),
    imageUrl: display?.imageUrl || DEFAULT_GAME_FALLBACK_IMAGE,
    imageCandidates: display?.imageCandidates?.length
      ? display.imageCandidates
      : [DEFAULT_GAME_FALLBACK_IMAGE],
    category: fallbacks.category ?? "",
  };
}

export async function resolveGameListGames(
  inputs: Array<ResolveGameDisplayInput & { category?: string; title?: string }>,
  options?: {
    steamId?: string | null;
    persist?: boolean;
  },
): Promise<Game[]> {
  const enriched = await attachGameListDisplay(
    inputs.map(({ appId }) => ({ appId })),
    options,
  );

  return inputs.map((input, index) =>
    mapGameListDisplayToGame(
      input.appId,
      enriched[index],
      { title: input.title, category: input.category },
    ),
  );
}

export async function resolveGameListGamesFromDisplays(
  inputs: Array<ResolveGameDisplayInput & { category?: string; title?: string }>,
  options?: {
    steamId?: string | null;
    persist?: boolean;
  },
): Promise<Game[]> {
  const displays = await resolveGameListBatch(inputs, options);

  return inputs.map((input) => {
    const display = displays.get(input.appId);

    if (!display) {
      return mapGameListDisplayToGame(input.appId, undefined, {
        title: input.title,
        category: input.category,
      });
    }

    return gameDisplayToGame(display, input.category ?? "");
  });
}
