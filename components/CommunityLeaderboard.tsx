import Image from "next/image";
import Link from "next/link";
import type { CommunityLeaderboardPlayer } from "@/lib/community/rankings";
import { cn } from "@/lib/utils";

type CommunityLeaderboardProps = {
  players: CommunityLeaderboardPlayer[];
  className?: string;
};

export function CommunityLeaderboard({
  players,
  className,
}: CommunityLeaderboardProps) {
  return (
    <section className={cn("mt-20 pb-6", className)}>
      <h2 className="text-xl font-semibold tracking-wide text-white sm:text-2xl">
        Community Leaderboard
      </h2>

      {players.length > 0 ? (
        <ol className="mt-5 space-y-3">
          {players.map((player) => (
            <li key={player.steamId}>
              <Link
                href={`/user/${player.steamId}`}
                className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 shadow-[0_0_30px_rgba(107,47,214,0.08)] backdrop-blur-md transition duration-[250ms] hover:scale-[1.01] hover:border-white/15 hover:bg-white/[0.07]"
              >
                <span className="w-6 shrink-0 text-center text-sm font-semibold text-white/45">
                  {player.rank}
                </span>
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/15 bg-[#140B2D]">
                  {player.avatarUrl ? (
                    <Image
                      src={player.avatarUrl}
                      alt={`${player.username}'s avatar`}
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-white/60">
                      {player.username.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white sm:text-base">
                    {player.username}
                  </p>
                  <p className="mt-0.5 text-xs text-white/55 sm:text-sm">
                    {player.hoursPlayed.toLocaleString()}h played
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-5 rounded-xl border border-white/10 bg-white/5 px-4 py-5 text-sm text-white/60">
          No synced players yet. Sign in with Steam to appear on the community
          leaderboard.
        </p>
      )}

      <div className="mt-5 flex justify-end">
        <Link
          href="/leaderboards"
          className="text-sm font-medium text-white/65 transition hover:text-white sm:text-base"
        >
          View Full Leaderboard →
        </Link>
      </div>
    </section>
  );
}
