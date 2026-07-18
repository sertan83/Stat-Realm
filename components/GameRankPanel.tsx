"use client";

import { Link } from "@/i18n/navigation";
import type { RankedCommunityGame } from "@/lib/community/rankings";
import { cn } from "@/lib/utils";

type GameRankPanelProps = {
  title: string;
  games: RankedCommunityGame[];
  className?: string;
};

export function GameRankPanel({ title, games, className }: GameRankPanelProps) {
  return (
    <aside
      className={cn(
        "flex h-full w-full flex-col rounded-xl border border-white/10 bg-white/5 p-4 shadow-[0_0_40px_rgba(107,47,214,0.12)] backdrop-blur-md",
        className,
      )}
    >
      <h3 className="shrink-0 text-sm font-semibold tracking-wide text-white sm:text-base">
        {title}
      </h3>

      <ol className="mt-3 flex flex-1 flex-col justify-between gap-0.5">
        {games.map((game, index) => (
          <li
            key={game.appId}
            className="truncate rounded-md text-xs text-white/75 sm:text-sm"
          >
            <Link
              href={`/game/${game.appId}`}
              className="block truncate rounded-md px-2 py-1 transition duration-[250ms] hover:scale-[1.02] hover:bg-white/5 hover:text-white"
            >
              <span className="mr-1.5 font-medium text-white/45">
                {index + 1}.
              </span>
              {game.name}
            </Link>
          </li>
        ))}
      </ol>
    </aside>
  );
}
