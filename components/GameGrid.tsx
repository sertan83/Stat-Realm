"use client";

import { useTranslations } from "next-intl";
import { GameCard } from "@/components/GameCard";
import { Link } from "@/i18n/navigation";
import type { Game } from "@/types/game";
import { cn } from "@/lib/utils";

type GameGridProps = {
  games: Game[];
  className?: string;
};

export function GameGrid({ games, className }: GameGridProps) {
  const t = useTranslations("landing");

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-5",
        className,
      )}
    >
      {games.map((game, index) => (
        <Link
          key={game.id}
          href={`/game/${game.id}`}
          aria-label={t("viewGameDetails", { name: game.title })}
          className="block w-full rounded-lg transition duration-[250ms] hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E2363C]"
        >
          <GameCard game={game} priority={index < 4} />
        </Link>
      ))}
    </div>
  );
}
