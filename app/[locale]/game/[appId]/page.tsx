import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { Navbar } from "@/components/Navbar";
import { AchievementList } from "@/components/game-details/AchievementList";
import { GameDetailsHero } from "@/components/game-details/GameDetailsHero";
import { GameReviewsSection } from "@/components/game-details/GameReviewsSection";
import { Leaderboard } from "@/components/game-details/Leaderboard";
import { YourPosition } from "@/components/game-details/YourPosition";
import { MetricGrid } from "@/components/game-details/MetricGrid";
import { SectionHeading } from "@/components/game-details/SectionHeading";
import { SimilarGames } from "@/components/game-details/SimilarGames";
import { getPathname, Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { createGameDetailsFromAppId, gameDetailAppIds } from "@/data/game-details";
import { getUserLibrary } from "@/lib/db";
import { getGameDbCommunitySnapshot, getUserGamePosition } from "@/lib/game-details/db-community";
import { resolveSlugToAppId } from "@/lib/game-details/resolve-slug-to-app-id";
import { parseGameRouteAppId } from "@/lib/game-details/route-param";
import {
  buildStatRealmCommunityStatisticsFromDb,
  buildStatRealmGameStatisticsFromDb,
} from "@/lib/game-details/statrealm-statistics";
import { createIntlFormatters, formatPlaytimeMinutes } from "@/lib/i18n/formatters";
import { loadGameReviewsPage } from "@/lib/reviews/game-reviews";
import { parseGameReviewsQuery } from "@/lib/reviews/query-params";
import {
  getAuthenticatedSteamProfile,
  getOwnedGames,
} from "@/lib/steam/api";
import { getGameAchievementsForDetails } from "@/lib/steam/game-achievements";
import { syncUserSteamLibrary } from "@/lib/steam/library-sync";
import {
  buildSteamBannerImageCandidates,
  buildSteamCoverImageCandidates,
  resolveCapsuleFilenameForApp,
} from "@/lib/steam/game-images";
import { getCachedStoreAppRecord } from "@/lib/steam/store-app-cache";
import { GAME_NAME_LOADING_LABEL } from "@/lib/game-metadata/constants";
import { resolveGameDisplayName } from "@/lib/steam/game-metadata";
import { getSteamStoreAppDetails } from "@/lib/steam/store-app-details";
import {
  UNKNOWN_DEVELOPER,
  UNKNOWN_RELEASE_YEAR,
  UNAVAILABLE_REVIEWS,
} from "@/lib/steam/store-metadata-labels";
import { withPromiseTimeout } from "@/lib/utils/promise-timeout";
import type { GameDetails } from "@/types/game-details";

type GamePageProps = {
  params: Promise<{ locale: string; appId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function buildSearchQueryString(
  searchParams: Record<string, string | string[] | undefined>,
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") {
      params.set(key, value);
      continue;
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        params.append(key, entry);
      }
    }
  }

  return params.toString();
}

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    gameDetailAppIds.map((appId) => ({
      locale,
      appId: String(appId),
    })),
  );
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

function formatSteamPlaytime(
  value: unknown,
  unavailable: string,
  formatPlaytime = formatPlaytimeMinutes,
) {
  const minutes = toValidPlaytime(value);
  return minutes === null ? unavailable : formatPlaytime(minutes);
}

function formatUnlockDate(value: unknown, locale: string) {
  if (typeof value !== "number" && typeof value !== "string") {
    return undefined;
  }

  const timestamp = Number(value);

  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return undefined;
  }

  const date = new Date(timestamp * 1000);
  if (Number.isNaN(date.getTime())) return undefined;

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

async function resolveRouteAppId(routeParam: string) {
  const routeAppId = parseGameRouteAppId(routeParam);
  if (routeAppId !== null) {
    return routeAppId;
  }

  return resolveSlugToAppId(routeParam);
}

export async function generateMetadata({
  params,
}: GamePageProps): Promise<Metadata> {
  const { locale, appId: routeParam } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const routeAppId = await resolveRouteAppId(routeParam);

  if (routeAppId === null) {
    return { title: t("gameDetailsTitle", { title: GAME_NAME_LOADING_LABEL }) };
  }

  const gameName = await resolveGameDisplayName(routeAppId);
  const storeMetadata = await withPromiseTimeout(
    getSteamStoreAppDetails(routeAppId).catch(() => null),
    null,
  );
  const title =
    storeMetadata?.name && storeMetadata.name.trim().length > 0
      ? storeMetadata.name
      : gameName;

  return {
    title: t("gameDetailsTitle", { title }),
    description: t("gameDetailsDescription", { title }),
  };
}

export default async function GamePage({ params, searchParams }: GamePageProps) {
  const { locale, appId: routeParam } = await params;
  const resolvedSearchParams = await searchParams;
  const reviewsQuery = parseGameReviewsQuery(resolvedSearchParams);
  setRequestLocale(locale);

  let routeAppId = parseGameRouteAppId(routeParam);

  if (routeAppId === null) {
    const resolvedAppId = await resolveSlugToAppId(routeParam);

    if (resolvedAppId === null) {
      notFound();
    }

    const queryString = buildSearchQueryString(resolvedSearchParams);
    const targetPath = getPathname({
      locale,
      href: `/game/${resolvedAppId}`,
    });

    permanentRedirect(
      queryString ? `${targetPath}?${queryString}` : targetPath,
    );
  }

  const [tGameDetails, tCommon, tDashboard, tGameMetrics, tCommunityMetrics] =
    await Promise.all([
      getTranslations("gameDetails"),
      getTranslations("common"),
      getTranslations("dashboard"),
      getTranslations("gameDetailsMetrics"),
      getTranslations("communityMetrics"),
    ]);
  const formatters = createIntlFormatters(tCommon, tDashboard);
  const unavailable = tCommon("unavailable");

  const session = await auth();
  const isAuthenticated = Boolean(session?.user?.steamId);
  const steamId = session?.user?.steamId;

  let ownedGames: Awaited<ReturnType<typeof getOwnedGames>> = [];

  if (isAuthenticated && steamId) {
    ownedGames = await withPromiseTimeout(
      getOwnedGames(steamId).catch(() => []),
      [],
    );
  }

  const ownedGame = ownedGames.find(
    (game) => toValidAppId(game.appid) === routeAppId,
  );
  const ownedGameAppId = toValidAppId(ownedGame?.appid) ?? routeAppId;
  const gameAppId = ownedGameAppId;

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
    gameAppId !== null
      ? syncedLibrary.find((game) => game.appId === gameAppId)
      : undefined;

  const ownedName = ownedGame?.name;
  const storeMetadataPromise = withPromiseTimeout(
    getSteamStoreAppDetails(gameAppId).catch(() => null),
    null,
  );

  const [achievementDetails, storeMetadata, gameDbCommunity, userGamePosition] =
    await Promise.all([
      withPromiseTimeout(
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
      ),
      storeMetadataPromise,
      getGameDbCommunitySnapshot(gameAppId, {
        unavailable,
        formatPlaytime: formatters.formatPlaytime,
      }),
      isAuthenticated && steamId
        ? getUserGamePosition(gameAppId, steamId, {
            formatPlaytime: formatters.formatPlaytime,
          })
        : Promise.resolve(null),
    ]);

  const gameName = await resolveGameDisplayName(gameAppId, { steamId });

  const details: GameDetails = createGameDetailsFromAppId(gameAppId, gameName);

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
    tMetrics: tGameMetrics,
    tCommon,
  });
  const communityStatistics = buildStatRealmCommunityStatisticsFromDb({
    ownerCount: gameDbCommunity.ownerCount,
    averagePlaytimeMinutes: gameDbCommunity.averagePlaytimeMinutes,
    averageCompletion: gameDbCommunity.averageCompletion,
    tMetrics: tCommunityMetrics,
    tCommon,
  });
  const completionPercentage = ownedGame
    ? (syncedGame?.completionPercentage ?? null)
    : null;
  const personalizedDetails: GameDetails = {
    ...details,
    developer:
      !storeMetadata?.developer ||
      storeMetadata.developer === UNKNOWN_DEVELOPER
        ? tGameDetails("unknownDeveloper")
        : storeMetadata.developer,
    releaseYear:
      storeMetadata?.releaseYear === undefined ||
      storeMetadata.releaseYear === UNKNOWN_RELEASE_YEAR
        ? tGameDetails("unknownReleaseYear")
        : storeMetadata.releaseYear,
    reviewScore: storeMetadata?.reviewScore ?? UNAVAILABLE_REVIEWS,
    statistics: gameStatistics,
    communityStatistics,
    achievements: steamAchievements.map((achievement) => ({
      apiName: achievement.apiName,
      iconUrl: achievement.iconUrl,
      name: achievement.name,
      description: achievement.description,
      isUnlocked: achievement.isUnlocked,
      unlockedAt: formatUnlockDate(achievement.unlockTime, locale),
      globalUnlockPercentage: achievement.globalUnlockPercentage,
    })),
    leaderboard: gameDbCommunity.leaderboard,
  };
  const userProgress =
    isAuthenticated && ownedGame
      ? {
          playtime: formatSteamPlaytime(
            syncedGame?.playtimeMinutes ?? ownedGame.playtime_forever,
            unavailable,
            formatters.formatPlaytime,
          ),
          achievements:
            syncedGame &&
            syncedGame.achievementsUnlocked !== null &&
            syncedGame.achievementsTotal !== null &&
            completionPercentage !== null
              ? tGameDetails("achievementsWithProgress", {
                  unlocked: syncedGame.achievementsUnlocked,
                  total: syncedGame.achievementsTotal,
                  percentage: completionPercentage,
                })
              : unavailable,
        }
      : isAuthenticated
        ? {
            playtime: tCommon("hoursShort", { hours: 0 }),
            achievements:
              achievementTotal > 0
                ? tGameDetails("achievementsNotInLibrary", {
                    total: achievementTotal,
                  })
                : tGameDetails("achievementsNotInLibraryNoTotal"),
          }
        : undefined;
  const storeRecord = getCachedStoreAppRecord(gameAppId);
  const resolvedCapsuleFilename = resolveCapsuleFilenameForApp({
    capsuleFilename: ownedGame?.capsule_filename,
    imageUrl: personalizedDetails.game.imageUrl,
    storeData: storeRecord?.data ?? null,
  });
  const [bannerImageCandidates, coverImageCandidates] = await Promise.all([
    buildSteamBannerImageCandidates(gameAppId, {
      capsuleFilename: resolvedCapsuleFilename,
      storeData: storeRecord?.data ?? null,
    }),
    buildSteamCoverImageCandidates(gameAppId, {
      capsuleFilename: resolvedCapsuleFilename,
      storeData: storeRecord?.data ?? null,
    }),
  ]);

  console.info("[Steam Game Details] Resolved by AppID", {
    routeParam,
    appId: gameAppId,
    title: personalizedDetails.game.title,
    capsuleFilename: resolvedCapsuleFilename ?? null,
  });

  const reviewsData = await loadGameReviewsPage({
    appId: gameAppId,
    gameName: personalizedDetails.game.title,
    page: reviewsQuery.page,
    sort: reviewsQuery.sort,
    filter: reviewsQuery.filter,
    viewerSteamId: steamId ?? null,
  });

  return (
    <div className="min-h-screen text-white">
      <Navbar />

      <main className="relative overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
        <div className="relative z-10 mx-auto w-full max-w-7xl">
          <Link
            href="/explore"
            className="inline-flex items-center text-sm font-medium text-white/60 transition hover:text-white"
          >
            {tGameDetails("backToExplore")}
          </Link>

          <div className="mt-6">
            <GameDetailsHero
              details={personalizedDetails}
              bannerImageCandidates={bannerImageCandidates}
              coverImageCandidates={coverImageCandidates}
              gameAppId={gameAppId}
              isAuthenticated={isAuthenticated}
              userProgress={userProgress}
            />
          </div>

          <div className="mt-20 space-y-20">
            <section>
              <SectionHeading
                eyebrow={tGameDetails("sections.gameStatisticsEyebrow")}
                title={tGameDetails("sections.gameStatisticsTitle")}
              />
              <MetricGrid metrics={personalizedDetails.statistics} />
            </section>

            <section id="achievements" className="scroll-mt-8">
              <SectionHeading
                eyebrow={tGameDetails("sections.rarestAchievementsEyebrow")}
                title={tGameDetails("sections.rarestAchievementsTitle")}
              />
              <AchievementList
                achievements={personalizedDetails.achievements}
                gameSlug={String(gameAppId)}
                status={achievementDetails.status}
                dataSource={achievementDetails.dataSource}
              />
            </section>

            <section>
              <SectionHeading
                eyebrow={tGameDetails("sections.communityStatisticsEyebrow")}
                title={tGameDetails("sections.communityStatisticsTitle")}
              />
              <MetricGrid metrics={personalizedDetails.communityStatistics} />
            </section>

            <section>
              <SectionHeading
                eyebrow={tGameDetails("sections.leaderboardsEyebrow")}
                title={tGameDetails("sections.leaderboardsTitle")}
              />
              <Leaderboard players={personalizedDetails.leaderboard} />
              <YourPosition
                isAuthenticated={isAuthenticated}
                position={userGamePosition}
              />
            </section>

            <section>
              <SectionHeading
                eyebrow={tGameDetails("sections.reviewsEyebrow")}
                title={tGameDetails("sections.reviewsTitle")}
              />
              <GameReviewsSection
                appId={gameAppId}
                gameName={personalizedDetails.game.title}
                initialData={reviewsData}
                isAuthenticated={isAuthenticated}
                locale={locale}
                sort={reviewsQuery.sort}
                filter={reviewsQuery.filter}
                page={reviewsQuery.page}
                highlightReviewKey={reviewsQuery.highlightReview}
              />
            </section>

            <section className="pb-12">
              <SectionHeading
                eyebrow={tGameDetails("sections.similarGamesEyebrow")}
                title={tGameDetails("sections.similarGamesTitle")}
              />
              <SimilarGames games={personalizedDetails.similarGames} />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
