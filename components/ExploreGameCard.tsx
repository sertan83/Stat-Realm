"use client";

import { useTranslations } from "next-intl";
import { GameCard } from "@/components/GameCard";
import { GameName } from "@/components/GameName";
import { getGameDetailsHref } from "@/lib/game-details/game-href";
import { Link } from "@/i18n/navigation";
import type { Game } from "@/types/game";

type ExploreGameCardProps = {
  game: Game;
};

export function ExploreGameCard({ game }: ExploreGameCardProps) {
  const t = useTranslations("explore");
  const appId = Number(game.id);

  return (
    <Link
      href={getGameDetailsHref(game)}
      className="group block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E2363C]"
      aria-label={t("exploreGame", { name: game.title })}
    >
      <GameCard game={game} />
      <div className="px-1 pt-3">
        <h2 className="truncate text-base font-semibold text-white transition group-hover:text-white/85">
          <GameName appId={appId} name={game.title} />
        </h2>
        <p className="mt-1 text-sm text-white/55">{game.category}</p>
      </div>
    </Link>
  );
}
