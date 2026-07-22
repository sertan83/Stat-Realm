"use client";

import type { Game } from "@/types/game";
import { SteamGameImageByAppId } from "@/components/SteamGameImageByAppId";
import { cn } from "@/lib/utils";

type GameCardProps = {
  game: Game;
  className?: string;
};

export function GameCard({ game, className }: GameCardProps) {
  const appId = Number(game.id);

  return (
    <article
      className={cn(
        "group relative aspect-[460/215] overflow-hidden rounded-lg ring-1 ring-white/10 transition duration-300 hover:scale-[1.03] hover:ring-white/25",
        className,
      )}
    >
      <SteamGameImageByAppId
        appId={appId}
        alt={game.title}
        variant="card"
        initialCandidates={game.imageCandidates}
        preferredUrls={[game.imageUrl]}
        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 360px"
        className="object-cover transition duration-300 group-hover:brightness-110"
        imageCacheRole="card"
        wrapperClassName="absolute inset-0"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#140B2D]/60 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
    </article>
  );
}
