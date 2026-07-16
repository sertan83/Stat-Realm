import Link from "next/link";
import { GameCard } from "@/components/GameCard";
import { getGameDetailsHref } from "@/lib/game-details/game-href";
import type { Game } from "@/types/game";
import { cn } from "@/lib/utils";

type GameGridProps = {
  games: Game[];
  className?: string;
};

export function GameGrid({ games, className }: GameGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-5",
        className,
      )}
    >
      {games.map((game) => (
        <Link
          key={game.id}
          href={getGameDetailsHref(game)}
          aria-label={`View ${game.title} details`}
          className="rounded-lg transition duration-[250ms] hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E2363C]"
        >
          <GameCard game={game} />
        </Link>
      ))}
    </div>
  );
}
