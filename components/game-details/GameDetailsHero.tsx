import { SteamGameImage } from "@/components/game-details/SteamGameImage";
import { PersonalSteamSignInPrompt } from "@/components/game-details/PersonalSteamSignInPrompt";
import { UNAVAILABLE_REVIEWS } from "@/lib/steam/store-metadata-labels";
import type { SteamImageCandidate } from "@/types/steam-images";
import type { GameDetails } from "@/types/game-details";

type GameDetailsHeroProps = {
  details: GameDetails;
  bannerImageCandidates: SteamImageCandidate[];
  coverImageCandidates: SteamImageCandidate[];
  gameAppId?: number | null;
  isAuthenticated?: boolean;
  userProgress?: {
    playtime: string;
    achievements: string;
  };
};

export function GameDetailsHero({
  details,
  bannerImageCandidates,
  coverImageCandidates,
  gameAppId,
  isAuthenticated = false,
  userProgress,
}: GameDetailsHeroProps) {
  const { game } = details;

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-[0_0_60px_rgba(107,47,214,0.14)] backdrop-blur-md">
      <div className="relative h-56 sm:h-72 lg:h-96">
        <SteamGameImage
          gameTitle={game.title}
          imageRole="Banner"
          candidates={bannerImageCandidates}
          appId={gameAppId}
          imageCacheRole="banner"
          alt={`${game.title} banner`}
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#140B2D] via-[#140B2D]/35 to-transparent" />
      </div>

      <div className="relative -mt-24 grid gap-6 px-5 pb-7 sm:px-8 lg:grid-cols-[220px_1fr] lg:items-end">
        <div className="relative mx-auto aspect-[3/4] w-40 overflow-hidden rounded-xl border border-white/15 bg-[#140B2D] shadow-2xl sm:w-48 lg:mx-0 lg:w-[220px]">
          <SteamGameImage
            gameTitle={game.title}
            imageRole="Cover"
            candidates={coverImageCandidates}
            appId={gameAppId}
            imageCacheRole="cover"
            alt={`${game.title} cover`}
            priority
            sizes="220px"
            className="object-cover"
          />
        </div>

        <div className="pb-1 text-center lg:text-left">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            {game.title}
          </h1>
          <p className="mt-3 text-sm text-white/65 sm:text-base">
            {game.category} <span className="mx-2 text-white/30">•</span>
            {details.developer}
            <span className="mx-2 text-white/30">•</span>
            {details.releaseYear}
          </p>

          {details.reviewScore !== UNAVAILABLE_REVIEWS ? (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm">
              <span className="text-[#79D38C]">●</span>
              <span className="font-medium text-white">
                {details.reviewScore}
              </span>
              <span className="text-white/45">on Steam</span>
            </div>
          ) : null}

          {isAuthenticated && userProgress ? (
            <div className="mt-3 flex flex-wrap justify-center gap-2 text-sm text-white/65 lg:justify-start">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                Your playtime:{" "}
                <strong className="text-white">{userProgress.playtime}</strong>
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                Your achievements:{" "}
                <strong className="text-white">
                  {userProgress.achievements}
                </strong>
              </span>
            </div>
          ) : !isAuthenticated ? (
            <PersonalSteamSignInPrompt compact />
          ) : null}

          <div className="mt-6 flex flex-wrap justify-center gap-3 lg:justify-start">
            <a
              href={details.steamUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/15 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              View on Steam
            </a>
            <button
              type="button"
              className="rounded-full bg-[#E2363C] px-6 py-3 text-sm font-semibold text-white shadow-[0_0_30px_rgba(226,54,60,0.3)] transition hover:bg-[#F04449]"
            >
              Track This Game
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
