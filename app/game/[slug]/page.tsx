import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { Navbar } from "@/components/Navbar";
import { AchievementList } from "@/components/game-details/AchievementList";
import { GameDetailsHero } from "@/components/game-details/GameDetailsHero";
import { Leaderboard } from "@/components/game-details/Leaderboard";
import { YourPosition } from "@/components/game-details/YourPosition";
import { MetricGrid } from "@/components/game-details/MetricGrid";
import { SectionHeading } from "@/components/game-details/SectionHeading";
import { SimilarGames } from "@/components/game-details/SimilarGames";
import {
  createGameDetailsFromAppId,
  createGameDetailsFromSlug,
  gameDetailSlugs,
  getGameDetails,
} from "@/data/game-details";
import { getUserLibrary } from "@/lib/db";
import { getGameDbCommunitySnapshot, getUserGamePosition } from "@/lib/game-details/db-community";
import {
  buildStatRealmCommunityStatisticsFromDb,
  buildStatRealmGameStatisticsFromDb,
} from "@/lib/game-details/statrealm-statistics";
import { parseGameRouteAppId } from "@/lib/game-details/route-param";
import { slugifyGameName } from "@/lib/slugify-game-name";
import {
  formatPlaytime,
  getAuthenticatedSteamProfile,
  getOwnedGames,
  getSteamAppIdFromImage,
} from "@/lib/steam/api";
import { getGameAchievementsForDetails } from "@/lib/steam/game-achievements";
import { syncUserSteamLibrary } from "@/lib/steam/library-sync";
import {
  buildSteamBannerImageCandidates,
  buildSteamCoverImageCandidates,
  getDefaultGameImageCandidates,
  resolveCapsuleFilenameForApp,
} from "@/lib/steam/game-images";
import { getCachedStoreAppRecord } from "@/lib/steam/store-app-cache";
import {
  getSteamStoreAppDetails,
} from "@/lib/steam/store-app-details";
import {
  UNKNOWN_DEVELOPER,
  UNKNOWN_RELEASE_YEAR,
  UNAVAILABLE_REVIEWS,
} from "@/lib/steam/store-metadata-labels";
import { withPromiseTimeout } from "@/lib/utils/promise-timeout";
import type { GameDetails } from "@/types/game-details";

type GamePageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return gameDetailSlugs.map((slug) => ({ slug }));
}

function toValidAppId(value: unknown) {
  if (typeof value !== "number" && typeof value !== "string") {
    return null;
  }

  const appId = Number(value);
  return Number.isInteger(appId) && appId > 0 ? appId : null;
}

function toValidPlaytime(value: unknown) {
  if (typeof value !== "number" && typeof value !== "string") {
    return null;
  }

  const minutes = Number(value);
  return Number.isFinite(minutes) && minutes >= 0 ? minutes : null;
}

function formatSteamPlaytime(value: unknown) {
  const minutes = toValidPlaytime(value);
  return minutes === null ? "Unavailable" : formatPlaytime(minutes);
}

function formatUnlockDate(value: unknown) {
  if (typeof value !== "number" && typeof value !== "string") {
    return undefined;
  }

  const timestamp = Number(value);

  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return undefined;
  }

  const date = new Date(timestamp * 1000);
  if (Number.isNaN(date.getTime())) return undefined;

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function resolveLegacySlugDetails(slug: string): {
  details: GameDetails;
  appId: number | null;
} {
  const staticDetails = getGameDetails(slug);

  if (staticDetails) {
    return {
      details: staticDetails,
      appId: getSteamAppIdFromImage(staticDetails.game.imageUrl),
    };
  }

  return {
    details: createGameDetailsFromSlug(slug),
    appId: null,
  };
}

export async function generateMetadata({
  params,
}: GamePageProps): Promise<Metadata> {
  const { slug } = await params;
  const routeAppId = parseGameRouteAppId(slug);

  if (routeAppId !== null) {
    const storeMetadata = await withPromiseTimeout(
      getSteamStoreAppDetails(routeAppId).catch(() => null),
      null,
    );
    const title = storeMetadata?.name ?? `Steam App ${routeAppId}`;
    return {
      title: `${title} Statistics — StatRealm`,
      description: `Explore achievements, playtime, community statistics, and leaderboards for ${title}.`,
    };
  }

  const details = getGameDetails(slug);

  if (!details) {
    const title = slug
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
    return { title: `${title} Statistics — StatRealm` };
  }

  return {
    title: `${details.game.title} Statistics — StatRealm`,
    description: `Explore achievements, playtime, community statistics, and leaderboards for ${details.game.title}.`,
  };
}

export default async function GamePage({ params }: GamePageProps) {
  const { slug: routeParam } = await params;
  const session = await auth();
  const isAuthenticated = Boolean(session?.user?.steamId);
  const steamId = session?.user?.steamId;
  const routeAppId = parseGameRouteAppId(routeParam);

  let ownedGames: Awaited<ReturnType<typeof getOwnedGames>> = [];

  if (isAuthenticated && steamId) {
    ownedGames = await withPromiseTimeout(
      getOwnedGames(steamId).catch(() => []),
      [],
    );
  }

  let gameAppId: number | null = routeAppId;
  let details: GameDetails;

  if (routeAppId !== null) {
    const ownedName = ownedGames.find(
      (game) => toValidAppId(game.appid) === routeAppId,
    )?.name;
    const storeMetadata = await withPromiseTimeout(
      getSteamStoreAppDetails(routeAppId).catch(() => null),
      null,
    );
    const gameName =
      storeMetadata?.name ??
      (typeof ownedName === "string" && ownedName.trim()
        ? ownedName.trim()
        : `Steam App ${routeAppId}`);

    details = createGameDetailsFromAppId(routeAppId, gameName);
  } else {
    const legacy = resolveLegacySlugDetails(routeParam);
    details = legacy.details;
    gameAppId = legacy.appId;
  }

  const ownedGame =
    gameAppId !== null
      ? ownedGames.find((game) => toValidAppId(game.appid) === gameAppId)
      : ownedGames.find(
          (game) =>
            typeof game.name === "string" &&
            slugifyGameName(game.name) === routeParam,
        );
  const ownedGameAppId = toValidAppId(ownedGame?.appid) ?? gameAppId;

  if (ownedGameAppId !== null) {
    gameAppId = ownedGameAppId;
  }

  const profile =
    isAuthenticated && steamId && ownedGame
      ? await withPromiseTimeout(
          getAuthenticatedSteamProfile(steamId).catch(() => null),
          null,
        )
      : null;

  if (isAuthenticated && steamId && ownedGames.length > 0) {
    await syncUserSteamLibrary(steamId, {
      games: ownedGames,
      profile,
      gameCount: ownedGames.length,
    }).catch((error) => {
      console.error("[StatRealm] Failed to sync Steam library on game page", {
        steamId,
        error,
      });
    });
  }

  const syncedLibrary =
    isAuthenticated && steamId ? await getUserLibrary(steamId) : [];
  const syncedGame =
    ownedGameAppId !== null
      ? syncedLibrary.find((game) => game.appId === ownedGameAppId)
      : undefined;

  const [achievementDetails, storeMetadata, gameDbCommunity, userGamePosition] =
    await Promise.all([
    gameAppId !== null
      ? withPromiseTimeout(
          getGameAchievementsForDetails(gameAppId, {
            steamId,
            ownsGame: Boolean(ownedGame),
          }),
          {
            achievements: [],
            dataSource: "global" as const,
            status: "unavailable" as const,
          },
          20_000,
        )
      : Promise.resolve({
          achievements: [],
          dataSource: "global" as const,
          status: "unavailable" as const,
        }),
    gameAppId !== null
      ? withPromiseTimeout(
          getSteamStoreAppDetails(gameAppId).catch(() => null),
          null,
        )
      : Promise.resolve(null),
    gameAppId !== null
      ? getGameDbCommunitySnapshot(gameAppId)
      : Promise.resolve({
          ownerCount: 0,
          averagePlaytimeMinutes: null,
          averageCompletion: null,
          perfectGamesCount: 0,
          leaderboard: [],
        }),
    isAuthenticated && steamId && gameAppId !== null
      ? getUserGamePosition(gameAppId, steamId)
      : Promise.resolve(null),
  ]);

  const steamAchievements = achievementDetails.achievements;
  const achievementTotal =
    syncedGame?.achievementsTotal !== null &&
    syncedGame?.achievementsTotal !== undefined
      ? syncedGame.achievementsTotal
      : steamAchievements.length;
  const steamReviewPercentage =
    storeMetadata?.reviewPercentage &&
    storeMetadata.reviewPercentage !== UNAVAILABLE_REVIEWS
      ? storeMetadata.reviewPercentage
      : null;
  const gameStatistics = buildStatRealmGameStatisticsFromDb({
    ownerCount: gameDbCommunity.ownerCount,
    averagePlaytimeMinutes: gameDbCommunity.averagePlaytimeMinutes,
    averageCompletion: gameDbCommunity.averageCompletion,
    perfectGamesCount: gameDbCommunity.perfectGamesCount,
    achievementTotal,
    steamReviewPercentage,
  });
  const communityStatistics = buildStatRealmCommunityStatisticsFromDb({
    ownerCount: gameDbCommunity.ownerCount,
    averagePlaytimeMinutes: gameDbCommunity.averagePlaytimeMinutes,
    averageCompletion: gameDbCommunity.averageCompletion,
  });
  const completionPercentage = ownedGame
    ? (syncedGame?.completionPercentage ?? null)
    : null;
  const personalizedDetails: GameDetails = {
    ...details,
    developer: storeMetadata?.developer ?? UNKNOWN_DEVELOPER,
    releaseYear: storeMetadata?.releaseYear ?? UNKNOWN_RELEASE_YEAR,
    reviewScore: storeMetadata?.reviewScore ?? UNAVAILABLE_REVIEWS,
    statistics: gameStatistics,
    communityStatistics,
    achievements: steamAchievements.map((achievement) => ({
      apiName: achievement.apiName,
      iconUrl: achievement.iconUrl,
      name: achievement.name,
      description: achievement.description,
      isUnlocked: achievement.isUnlocked,
      unlockedAt: formatUnlockDate(achievement.unlockTime),
      globalUnlockPercentage: achievement.globalUnlockPercentage,
    })),
    leaderboard: gameDbCommunity.leaderboard,
  };
  const userProgress =
    isAuthenticated && ownedGame
      ? {
          playtime: formatSteamPlaytime(
            syncedGame?.playtimeMinutes ?? ownedGame.playtime_forever,
          ),
          achievements:
            syncedGame &&
            syncedGame.achievementsUnlocked !== null &&
            syncedGame.achievementsTotal !== null &&
            completionPercentage !== null
              ? `${syncedGame.achievementsUnlocked}/${syncedGame.achievementsTotal} (${completionPercentage}%)`
              : "Unavailable",
        }
      : isAuthenticated
        ? {
            playtime: "0h",
            achievements:
              achievementTotal > 0
                ? `0/${achievementTotal} (0%) · Not in your Steam library`
                : "0/0 (0%) · Not in your Steam library",
          }
        : undefined;
  const resolvedAppId =
    gameAppId ?? getSteamAppIdFromImage(personalizedDetails.game.imageUrl);
  const storeRecord =
    resolvedAppId !== null ? getCachedStoreAppRecord(resolvedAppId) : null;
  const resolvedCapsuleFilename = resolveCapsuleFilenameForApp({
    capsuleFilename: ownedGame?.capsule_filename,
    imageUrl: personalizedDetails.game.imageUrl,
    storeData: storeRecord?.data ?? null,
  });
  const [bannerImageCandidates, coverImageCandidates] =
    resolvedAppId !== null
      ? await Promise.all([
          buildSteamBannerImageCandidates(resolvedAppId, {
            capsuleFilename: resolvedCapsuleFilename,
            storeData: storeRecord?.data ?? null,
          }),
          buildSteamCoverImageCandidates(resolvedAppId, {
            capsuleFilename: resolvedCapsuleFilename,
            storeData: storeRecord?.data ?? null,
          }),
        ])
      : [getDefaultGameImageCandidates(), getDefaultGameImageCandidates()];

  if (resolvedAppId !== null) {
    console.info("[Steam Game Details] Resolved by AppID", {
      routeParam,
      appId: resolvedAppId,
      title: personalizedDetails.game.title,
      capsuleFilename: resolvedCapsuleFilename ?? null,
    });
  }

  return (
    <div className="min-h-screen text-white">
      <Navbar />

      <main className="relative overflow-hidden px-4 py-8 sm:px-6 lg:px-8">

        <div className="relative z-10 mx-auto w-full max-w-7xl">
          <Link
            href="/explore"
            className="inline-flex items-center text-sm font-medium text-white/60 transition hover:text-white"
          >
            ← Back to Explore
          </Link>

          <div className="mt-6">
            <GameDetailsHero
              details={personalizedDetails}
              bannerImageCandidates={bannerImageCandidates}
              coverImageCandidates={coverImageCandidates}
              gameAppId={resolvedAppId}
              isAuthenticated={isAuthenticated}
              userProgress={userProgress}
            />
          </div>

          <div className="mt-20 space-y-20">
            <section>
              <SectionHeading
                eyebrow="Game Statistics"
                title="Your realm at a glance"
              />
              <MetricGrid metrics={personalizedDetails.statistics} />
            </section>

            <section id="achievements" className="scroll-mt-8">
              <SectionHeading
                eyebrow="Rarest Achievements"
                title="Only the dedicated prevail"
              />
              <AchievementList
                achievements={personalizedDetails.achievements}
                gameSlug={personalizedDetails.game.slug}
                status={achievementDetails.status}
                dataSource={achievementDetails.dataSource}
              />
            </section>

            <section>
              <SectionHeading
                eyebrow="Community Statistics"
                title="How the community plays"
              />
              <MetricGrid metrics={personalizedDetails.communityStatistics} />
            </section>

            <section>
              <SectionHeading
                eyebrow="Leaderboards"
                title="Top 10 players"
              />
              <Leaderboard players={personalizedDetails.leaderboard} />
              <YourPosition
                isAuthenticated={isAuthenticated}
                position={userGamePosition}
              />
            </section>

            <section className="pb-12">
              <SectionHeading
                eyebrow="Similar Games"
                title="Continue exploring"
              />
              <SimilarGames games={personalizedDetails.similarGames} />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
