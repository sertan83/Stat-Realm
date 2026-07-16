import Image from "next/image";
import Link from "next/link";
import type { LeaderboardPlayer } from "@/types/leaderboard";

type LeaderboardPodiumProps = {
  players: LeaderboardPlayer[];
};

const podiumOrder = [1, 0, 2];
const medals = ["🥇", "🥈", "🥉"];

export function LeaderboardPodium({ players }: LeaderboardPodiumProps) {
  const orderedPlayers =
    players.length === 3
      ? podiumOrder.map((playerIndex) => players[playerIndex])
      : players;

  if (players.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Top three players"
      className="grid grid-cols-1 items-end gap-4 md:grid-cols-3"
    >
      {orderedPlayers.map((player) => {
        const playerIndex = players.indexOf(player);
        const isWinner = playerIndex === 0;

        return (
          <Link
            key={player.steamId}
            href={`/user/${player.steamId}`}
            className={`group rounded-xl border bg-white/5 p-6 text-center backdrop-blur-md transition duration-[250ms] hover:scale-[1.02] ${
              players.length === 1 ? "md:col-start-2" : ""
            } ${
              isWinner
                ? "border-[#E2363C]/40 shadow-[0_0_45px_rgba(226,54,60,0.18)] md:pb-9"
                : "border-white/10 shadow-[0_0_35px_rgba(107,47,214,0.12)]"
            }`}
          >
            <div className="text-3xl" aria-hidden="true">
              {medals[playerIndex]}
            </div>
            <p className="mt-1 text-xs font-semibold tracking-wider text-white/45 uppercase">
              #{playerIndex + 1}
            </p>
            <div
              className={`relative mx-auto mt-4 flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#6B2FD6] to-[#E2363C] font-bold text-white ring-2 ring-white/15 ${
                isWinner ? "h-20 w-20 text-xl" : "h-16 w-16 text-base"
              }`}
            >
              {player.avatarUrl ? (
                <Image
                  src={player.avatarUrl}
                  alt=""
                  fill
                  sizes={isWinner ? "80px" : "64px"}
                  className="object-cover"
                />
              ) : (
                player.initials
              )}
            </div>
            <h2 className="mt-4 truncate text-lg font-semibold text-white transition group-hover:text-white/80">
              {player.username}
            </h2>
            <div className="mt-3 flex items-center justify-center gap-4 text-sm">
              <span className="text-white/65">
                <strong className="text-white">
                  {player.hoursPlayed === null
                    ? "—"
                    : `${player.hoursPlayed.toLocaleString()}h`}
                </strong>{" "}
                played
              </span>
              <span className="text-white/65">
                <strong className="text-white">
                  {player.completion === null
                    ? "—"
                    : `${player.completion.toFixed(1)}%`}
                </strong>{" "}
                complete
              </span>
            </div>
          </Link>
        );
      })}
    </section>
  );
}
