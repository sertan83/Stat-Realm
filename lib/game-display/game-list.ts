import "server-only";

import { GAME_LIST_IMAGE_VARIANT } from "@/lib/game-display/constants";
import { attachGameDisplay } from "@/lib/game-display/attach";
import {
  gameDisplayToGame,
  resolveGameDisplayBatch,
} from "@/lib/game-display/resolve";
import type { ResolveGameDisplayInput } from "@/lib/game-display/types";
import type { Game } from "@/types/game";

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

export async function resolveGameListGames(
  inputs: Array<ResolveGameDisplayInput & { category?: string }>,
  options?: {
    steamId?: string | null;
    persist?: boolean;
  },
): Promise<Game[]> {
  const displays = await resolveGameListBatch(inputs, options);

  return inputs.map((input) => {
    const display = displays.get(input.appId);

    if (!display) {
      return {
        id: String(input.appId),
        title: "",
        slug: String(input.appId),
        imageUrl: "",
        imageCandidates: [],
        category: input.category ?? "",
      };
    }

    return gameDisplayToGame(display, input.category ?? "");
  });
}
