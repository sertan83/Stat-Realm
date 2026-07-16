import Link from "next/link";
import { GameCard } from "@/components/GameCard";
import { getGameDetailsHref } from "@/lib/game-details/game-href";
import type { Game } from "@/types/game";

type ExploreGameCardProps = {
  game: Game;
};

export function ExploreGameCard({ game }: ExploreGameCardProps) {
  return (
    <Link
      href={getGameDetailsHref(game)}
      className="group block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E2363C]"
      aria-label={`Explore ${game.title}`}
    >
      <GameCard game={game} />
      <div className="px-1 pt-3">
        <h2 className="truncate text-base font-semibold text-white transition group-hover:text-white/85">
          {game.title}
        </h2>
        <p className="mt-1 text-sm text-white/55">{game.category}</p>
      </div>
    </Link>
  );
}
