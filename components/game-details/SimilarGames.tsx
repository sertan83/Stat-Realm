"use client";

import { GameCard } from "@/components/GameCard";
import { GameName } from "@/components/GameName";
import { getGameDetailsHref } from "@/lib/game-details/game-href";
import { Link } from "@/i18n/navigation";
import type { Game } from "@/types/game";

type SimilarGamesProps = {
  games: Game[];
};

export function SimilarGames({ games }: SimilarGamesProps) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {games.map((game) => (
        <Link
          key={game.id}
          href={getGameDetailsHref(game)}
          className="group rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E2363C]"
        >
          <GameCard game={game} />
          <h3 className="mt-3 truncate font-semibold text-white transition group-hover:text-white/80">
            <GameName appId={Number(game.id)} name={game.title} />
          </h3>
          <p className="mt-1 text-sm text-white/50">{game.category}</p>
        </Link>
      ))}
    </div>
  );
}
