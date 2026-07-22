"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { GameName } from "@/components/GameName";
import type { DashboardGame } from "@/types/dashboard";
import { getGameDetailsHref } from "@/lib/game-details/game-href";
import { Link } from "@/i18n/navigation";
import { reportSuccessfulGameImage } from "@/lib/steam/report-game-image-cache";

function DashboardGameCard({
  game,
  rank,
  compact = false,
}: {
  game: DashboardGame;
  rank?: number;
  compact?: boolean;
}) {
  const t = useTranslations("dashboard");
  const candidates = useMemo(() => {
    const baseCandidates =
      game.imageCandidates && game.imageCandidates.length > 0
        ? game.imageCandidates
        : [game.imageUrl, game.imageFallbackUrl].filter(
            (candidate): candidate is string => Boolean(candidate),
          );

    return Array.from(new Set(baseCandidates));
  }, [game.imageCandidates, game.imageFallbackUrl, game.imageUrl]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const activeUrl = candidates[candidateIndex];
  const appId = Number(game.id);
  const showPlaceholder = !activeUrl || candidateIndex >= candidates.length;

  return (
    <Link
      href={getGameDetailsHref(game)}
      className={`group overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-md transition duration-[250ms] hover:scale-[1.02] hover:border-white/15 hover:shadow-[0_0_35px_rgba(107,47,214,0.16)] ${
        compact ? "flex min-w-0 items-center p-3" : "block w-[280px] shrink-0"
      }`}
    >
      <div
        className={`relative overflow-hidden rounded-lg ${
          compact ? "h-20 w-32 shrink-0" : "aspect-[460/215] w-full rounded-b-none"
        }`}
      >
        {showPlaceholder ? (
          <div className="flex h-full w-full items-center justify-center bg-white/5 px-3 text-center text-xs font-medium text-white/45">
            {t("noImageAvailable")}
          </div>
        ) : (
          <Image
            key={activeUrl}
            src={activeUrl}
            alt={game.title}
            fill
            sizes={compact ? "128px" : "280px"}
            onLoad={() => {
              if (Number.isInteger(appId) && appId > 0) {
                reportSuccessfulGameImage(appId, "card", activeUrl);
              }
            }}
            onError={() => {
              if (candidateIndex + 1 < candidates.length) {
                setCandidateIndex((currentIndex) => currentIndex + 1);
              } else {
                setCandidateIndex(candidates.length);
              }
            }}
            className="object-cover transition duration-300 group-hover:brightness-110"
          />
        )}
        {rank ? (
          <span className="absolute top-2 left-2 flex h-7 w-7 items-center justify-center rounded-md bg-[#140B2D]/85 text-xs font-bold text-white backdrop-blur-sm">
            {rank}
          </span>
        ) : null}
      </div>

      <div className={compact ? "min-w-0 flex-1 px-4" : "p-4"}>
        <h3 className="truncate font-semibold text-white">
          <GameName appId={appId} name={game.title} />
        </h3>
        <div className="mt-2 flex items-center justify-between gap-3 text-xs text-white/45">
          <span>{game.playtime}</span>
          <span>{game.lastPlayed}</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[#E2363C]"
            style={{ width: `${game.completion ?? 0}%` }}
          />
        </div>
        <p className="mt-1.5 text-right text-xs text-white/45">
          {game.completion === null
            ? game.completionStatus === "unavailable"
              ? t("achievementSyncFailed")
              : t("completionUnavailable")
            : t("percentComplete", { percentage: game.completion })}
        </p>
      </div>
    </Link>
  );
}

export function RecentlyPlayed({
  games,
}: {
  games: DashboardGame[];
}) {
  const t = useTranslations("dashboard");

  return (
    <section>
      <h2 className="text-2xl font-bold text-white sm:text-3xl">
        {t("recentlyPlayed")}
      </h2>
      <div className="mt-6 flex gap-5 overflow-x-auto pb-4">
        {games.map((game) => (
          <DashboardGameCard key={game.id} game={game} />
        ))}
      </div>
    </section>
  );
}

export function MostPlayedGames({
  games,
}: {
  games: DashboardGame[];
}) {
  const t = useTranslations("dashboard");

  return (
    <section>
      <h2 className="text-2xl font-bold text-white sm:text-3xl">
        {t("mostPlayedGames")}
      </h2>
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {games.map((game, index) => (
          <DashboardGameCard
            key={game.id}
            game={game}
            rank={index + 1}
            compact
          />
        ))}
      </div>
    </section>
  );
}
