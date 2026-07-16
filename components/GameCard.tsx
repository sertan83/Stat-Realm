"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { Game } from "@/types/game";
import { DEFAULT_GAME_FALLBACK_IMAGE } from "@/lib/steam/image-constants";
import { reportSuccessfulGameImage } from "@/lib/steam/report-game-image-cache";
import { cn } from "@/lib/utils";

type GameCardProps = {
  game: Game;
  className?: string;
};

export function GameCard({ game, className }: GameCardProps) {
  const candidates = useMemo(() => {
    const baseCandidates =
      game.imageCandidates && game.imageCandidates.length > 0
        ? game.imageCandidates
        : [game.imageUrl];

    return baseCandidates.some(
      (candidate) => candidate === DEFAULT_GAME_FALLBACK_IMAGE,
    )
      ? baseCandidates
      : [...baseCandidates, DEFAULT_GAME_FALLBACK_IMAGE];
  }, [game.imageCandidates, game.imageUrl]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const activeUrl = candidates[candidateIndex] ?? candidates[0];
  const appId = Number(game.id);

  return (
    <article
      className={cn(
        "group relative aspect-[460/215] overflow-hidden rounded-lg ring-1 ring-white/10 transition duration-300 hover:scale-[1.03] hover:ring-white/25",
        className,
      )}
    >
      <Image
        key={activeUrl}
        src={activeUrl}
        alt={game.title}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 360px"
        className="object-cover transition duration-300 group-hover:brightness-110"
        onLoad={() => {
          if (
            Number.isInteger(appId) &&
            appId > 0 &&
            activeUrl !== DEFAULT_GAME_FALLBACK_IMAGE
          ) {
            reportSuccessfulGameImage(appId, "card", activeUrl);
          }
        }}
        onError={() => {
          if (candidateIndex + 1 < candidates.length) {
            setCandidateIndex((currentIndex) => currentIndex + 1);
          }
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#140B2D]/60 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
    </article>
  );
}
