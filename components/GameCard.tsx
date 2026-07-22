"use client";

import type { Game } from "@/types/game";
import { SteamGameImageByAppId } from "@/components/SteamGameImageByAppId";
import { GAME_LIST_IMAGE_VARIANT } from "@/lib/game-display/constants";
import { cn } from "@/lib/utils";

type GameCardProps = {
  game: Game;
  className?: string;
};

export function GameCard({ game, className }: GameCardProps) {
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
      <SteamGameImageByAppId
        appId={appId}
        alt={game.title}
        variant={GAME_LIST_IMAGE_VARIANT}
        initialCandidates={game.imageCandidates}
        preferredUrls={[game.imageUrl]}
        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 360px"
        unoptimized
        className="object-cover transition duration-300 group-hover:brightness-110"
        imageCacheRole="card"
        wrapperClassName="absolute inset-0"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#140B2D]/60 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
    </article>
  );
}
