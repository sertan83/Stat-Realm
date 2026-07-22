"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { GameName } from "@/components/GameName";
import { Link } from "@/i18n/navigation";
import type { LandingTopRatedGame } from "@/lib/landing/top-rated-games";
import { DEFAULT_GAME_FALLBACK_IMAGE } from "@/lib/steam/image-constants";
import { cn } from "@/lib/utils";

type CommunityTopGamesProps = {
  games: LandingTopRatedGame[];
  className?: string;
};

function TopRatedGameImage({
  game,
  alt,
}: {
  game: LandingTopRatedGame;
  alt: string;
}) {
  const candidates = useMemo(
    () =>
      game.imageCandidates.length > 0
        ? game.imageCandidates
        : [game.imageUrl, DEFAULT_GAME_FALLBACK_IMAGE],
    [game.imageCandidates, game.imageUrl],
  );
  const [candidateIndex, setCandidateIndex] = useState(0);
  const activeUrl = candidates[candidateIndex] ?? DEFAULT_GAME_FALLBACK_IMAGE;

  return (
    <Image
      src={activeUrl}
      alt={alt}
      fill
      unoptimized
      sizes="46px"
      className="object-cover"
      onError={() => {
        if (candidateIndex + 1 < candidates.length) {
          setCandidateIndex((currentIndex) => currentIndex + 1);
        }
      }}
    />
  );
}

export function CommunityTopGames({ games, className }: CommunityTopGamesProps) {
  const t = useTranslations("landing");

  return (
    <section className={cn("mt-12 pb-6", className)}>
      <h2 className="text-xl font-semibold tracking-wide text-white sm:text-2xl">
        {t("topRatedGames")}
      </h2>

      {games.length > 0 ? (
        <ol className="mt-5 space-y-3">
          {games.map((game) => (
            <li key={game.appId}>
              <Link
                href={`/game/${game.appId}`}
                className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 shadow-[0_0_30px_rgba(107,47,214,0.08)] backdrop-blur-md transition duration-[250ms] hover:scale-[1.01] hover:border-white/15 hover:bg-white/[0.07]"
              >
                <span className="w-6 shrink-0 text-center text-sm font-semibold text-white/45">
                  {game.rank}
                </span>

                <div className="relative h-10 w-[46px] shrink-0 overflow-hidden rounded-md border border-white/15 bg-[#140B2D]">
                  <TopRatedGameImage game={game} alt={game.gameName} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white sm:text-base">
                    <GameName appId={game.appId} name={game.gameName} />
                  </p>
                </div>

                <p className="shrink-0 text-sm font-semibold text-[#EFA5A8] sm:text-base">
                  {t("topGameRating", {
                    rating: game.averageRating.toFixed(1),
                  })}
                </p>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-5 rounded-xl border border-white/10 bg-white/5 px-4 py-5 text-sm text-white/60">
          {t("noRatedGames")}
        </p>
      )}

      <div className="mt-5 flex justify-end">
        <Link
          href="/ratings"
          className="text-sm font-medium text-white/65 transition hover:text-white sm:text-base"
        >
          {t("viewAllRatings")}
        </Link>
      </div>
    </section>
  );
}
