"use client";

import type { Game } from "@/types/game";
import { GameListImage } from "@/components/GameListImage";
import { cn } from "@/lib/utils";

type GameCardProps = {
  game: Game;
  className?: string;
  priority?: boolean;
};

export function GameCard({ game, className, priority = false }: GameCardProps) {
  const appId = Number(game.id);

  if (!Number.isInteger(appId) || appId <= 0) {
    return null;
  }

  return (
    <article
      className={cn(
        "group relative aspect-[460/215] w-full overflow-hidden rounded-lg ring-1 ring-white/10 transition duration-300 hover:scale-[1.03] hover:ring-white/25",
        className,
      )}
    >
      <GameListImage
        appId={appId}
        alt={game.title}
        imageUrl={game.imageUrl}
        imageCandidates={game.imageCandidates}
        preferredUrls={[game.imageUrl]}
        priority={priority}
        sizes="(max-width: 768px) 50vw, (max-width: 1280px) 25vw, 360px"
        className="object-cover transition duration-300 group-hover:brightness-110"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#140B2D]/60 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
    </article>
  );
}
