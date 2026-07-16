import Image from "next/image";
import Link from "next/link";
import { signInWithSteam } from "@/app/actions/auth";
import type { GameUserPosition } from "@/types/game-details";

type YourPositionProps = {
  isAuthenticated: boolean;
  position: GameUserPosition | null;
};

function formatAchievements(position: GameUserPosition) {
  if (
    position.achievementsUnlocked === null ||
    position.achievementsTotal === null
  ) {
    return "Unavailable";
  }

  return `${position.achievementsUnlocked.toLocaleString()} / ${position.achievementsTotal.toLocaleString()}`;
}

function formatCompletion(position: GameUserPosition) {
  return position.completionPercentage === null
    ? "Unavailable"
    : `${position.completionPercentage}%`;
}

export function YourPosition({
  isAuthenticated,
  position,
}: YourPositionProps) {
  return (
    <section aria-label="Your position" className="mt-6">
      <div className="mb-4">
        <p className="text-xs font-semibold tracking-[0.18em] text-[#EFA5A8] uppercase">
          Your Position
        </p>
      </div>

      {!isAuthenticated ? (
        <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/5 p-5 shadow-[0_0_30px_rgba(107,47,214,0.12)] backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <p className="text-sm leading-relaxed text-white/65">
            Sign in with Steam to see your personal ranking for this game.
          </p>
          <form action={signInWithSteam} className="shrink-0">
            <button
              type="submit"
              className="inline-flex h-10 w-full items-center justify-center gap-2.5 rounded-lg bg-[#1B2838] px-4 text-sm font-medium text-white transition hover:bg-[#2A475E] sm:w-auto"
            >
              <Image
                src="/steamlogo.svg"
                alt=""
                width={20}
                height={20}
                unoptimized
                className="shrink-0"
              />
              Sign in with Steam
            </button>
          </form>
        </div>
      ) : !position ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-white/65 shadow-[0_0_30px_rgba(107,47,214,0.12)] backdrop-blur-md sm:p-6">
          This game is not in your Steam library.
        </div>
      ) : (
        <div className="rounded-xl border border-[#6B2FD6]/35 bg-white/5 p-5 shadow-[0_0_35px_rgba(107,47,214,0.16)] backdrop-blur-md sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <Link
                href={`/user/${position.steamId}`}
                aria-label={`View ${position.username}'s profile`}
                className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#6B2FD6] to-[#E2363C] text-base font-bold text-white ring-2 ring-[#6B2FD6]/40 transition hover:scale-105"
              >
                {position.avatarUrl ? (
                  <Image
                    src={position.avatarUrl}
                    alt=""
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                ) : (
                  position.initials
                )}
              </Link>
              <div className="min-w-0">
                <Link
                  href={`/user/${position.steamId}`}
                  className="truncate text-lg font-semibold text-white transition hover:text-[#EFA5A8]"
                >
                  {position.username}
                </Link>
                {position.perfectGame ? (
                  <span className="mt-2 inline-flex rounded-full bg-[#E2363C]/15 px-2.5 py-1 text-xs font-semibold text-[#EFA5A8]">
                    Perfect Game
                  </span>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-xs tracking-wide text-white/45 uppercase">
                  Rank
                </p>
                <p className="mt-1 font-semibold text-white">
                  #{position.rank.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs tracking-wide text-white/45 uppercase">
                  Playtime
                </p>
                <p className="mt-1 font-semibold text-white">
                  {position.playtime}
                </p>
              </div>
              <div>
                <p className="text-xs tracking-wide text-white/45 uppercase">
                  Achievements
                </p>
                <p className="mt-1 font-semibold text-white">
                  {formatAchievements(position)}
                </p>
              </div>
              <div>
                <p className="text-xs tracking-wide text-white/45 uppercase">
                  Completion
                </p>
                <p className="mt-1 font-semibold text-white">
                  {formatCompletion(position)}
                </p>
              </div>
              <div>
                <p className="text-xs tracking-wide text-white/45 uppercase">
                  Steam Level
                </p>
                <p className="mt-1 font-semibold text-white">
                  {position.steamLevel ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-xs tracking-wide text-white/45 uppercase">
                  Country
                </p>
                <p className="mt-1 font-semibold text-white">
                  {position.countryFlag} {position.country}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
