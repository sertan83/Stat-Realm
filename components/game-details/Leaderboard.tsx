import Image from "next/image";
import Link from "next/link";
import type { LeaderboardPlayer } from "@/types/game-details";

type LeaderboardProps = {
  players: LeaderboardPlayer[];
};

export function Leaderboard({ players }: LeaderboardProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5 backdrop-blur-md">
      <table className="w-full min-w-[720px] border-collapse">
        <thead>
          <tr className="border-b border-white/10 text-left text-xs tracking-wide text-white/45 uppercase">
            <th className="px-5 py-4 font-medium">Player</th>
            <th className="px-5 py-4 font-medium">Most Hours Played</th>
            <th className="px-5 py-4 font-medium">Highest Completion %</th>
            <th className="px-5 py-4 font-medium">Fastest Completion</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {players.map((player) => {
            const profileHref = player.steamId
              ? `/user/${player.steamId}`
              : null;

            return (
            <tr
              key={player.rank}
              className="transition duration-[250ms] hover:bg-white/5"
            >
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <span className="w-5 text-sm font-semibold text-white/40">
                    {player.rank}
                  </span>
                  {profileHref ? (
                    <Link
                      href={profileHref}
                      aria-label={`View ${player.username}'s profile`}
                      className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#6B2FD6] to-[#E2363C] text-xs font-bold text-white transition hover:scale-105"
                    >
                      {player.avatarUrl ? (
                        <Image
                          src={player.avatarUrl}
                          alt=""
                          fill
                          sizes="36px"
                          className="object-cover"
                        />
                      ) : (
                        player.initials
                      )}
                    </Link>
                  ) : (
                    <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#6B2FD6] to-[#E2363C] text-xs font-bold text-white">
                      {player.avatarUrl ? (
                        <Image
                          src={player.avatarUrl}
                          alt=""
                          fill
                          sizes="36px"
                          className="object-cover"
                        />
                      ) : (
                        player.initials
                      )}
                    </span>
                  )}
                  {profileHref ? (
                    <Link
                      href={profileHref}
                      className="font-medium text-white transition hover:text-[#EFA5A8]"
                    >
                      {player.username}
                    </Link>
                  ) : (
                    <span className="font-medium text-white">
                      {player.username}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-5 py-3.5 text-sm text-white/70">
                {player.hoursPlayed}
              </td>
              <td className="px-5 py-3.5 text-sm text-white/70">
                {player.completion}
              </td>
              <td className="px-5 py-3.5 text-sm text-white/70">
                {player.fastestCompletion}
              </td>
            </tr>
            );
          })}
          {players.length === 0 && (
            <tr>
              <td
                colSpan={4}
                className="px-5 py-10 text-center text-sm text-white/45"
              >
                No leaderboard entry is available for this Steam library.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
