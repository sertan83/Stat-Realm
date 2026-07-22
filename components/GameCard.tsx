"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { Game } from "@/types/game";
import { GAME_LIST_IMAGE_VARIANT } from "@/lib/game-display/constants";
import { buildSteamGameImageCandidates } from "@/lib/steam/game-image-candidates-client";
import { DEFAULT_GAME_FALLBACK_IMAGE } from "@/lib/steam/image-constants";
import { cn } from "@/lib/utils";

type GameCardProps = {
  game: Game;
  className?: string;
  priority?: boolean;
};

function buildCardImageCandidates(game: Game, appId: number) {
  const seen = new Set<string>();
  const candidates: string[] = [];

  function add(url: string | null | undefined) {
    const normalized = url?.trim();
    if (!normalized || seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    candidates.push(normalized);
  }

  add(game.imageUrl);

  for (const candidate of game.imageCandidates ?? []) {
    add(candidate);
  }

  for (const candidate of buildSteamGameImageCandidates(appId, {
    variant: GAME_LIST_IMAGE_VARIANT,
    preferredUrls: [game.imageUrl],
  })) {
    add(candidate);
  }

  if (!candidates.includes(DEFAULT_GAME_FALLBACK_IMAGE)) {
    candidates.push(DEFAULT_GAME_FALLBACK_IMAGE);
  }

  return candidates;
}

export function GameCard({ game, className, priority = false }: GameCardProps) {
  const appId = Number(game.id);
  const [candidateIndex, setCandidateIndex] = useState(0);

  const candidates = useMemo(
    () => buildCardImageCandidates(game, appId),
    [appId, game.imageCandidates, game.imageUrl],
  );

  if (!Number.isInteger(appId) || appId <= 0) {
    return null;
  }

  const activeUrl = candidates[candidateIndex] ?? DEFAULT_GAME_FALLBACK_IMAGE;

  return (
    <article
      className={cn(
        "group relative aspect-[460/215] w-full overflow-hidden rounded-lg ring-1 ring-white/10 transition duration-300 hover:scale-[1.03] hover:ring-white/25",
        className,
      )}
    >
      <Image
        src={activeUrl}
        alt={game.title}
        fill
        priority={priority}
        unoptimized
        sizes="(max-width: 768px) 50vw, (max-width: 1280px) 25vw, 360px"
        className="object-cover transition duration-300 group-hover:brightness-110"
        onError={() => {
          if (candidateIndex + 1 < candidates.length) {
            setCandidateIndex((currentIndex) => currentIndex + 1);
          }
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#140B2D]/60 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
    </article>
  );
}
