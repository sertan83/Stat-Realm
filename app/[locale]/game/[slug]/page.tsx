import type { Metadata } from "next";
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
import { Link } from "@/i18n/navigation";
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
import { createIntlFormatters, formatPlaytimeMinutes } from "@/lib/i18n/formatters";
import { loadGameReviewsPage } from "@/lib/reviews/game-reviews";
import { parseGameReviewsQuery } from "@/lib/reviews/query-params";
import { parseGameRouteAppId } from "@/lib/game-details/route-param";
import { slugifyGameName } from "@/lib/slugify-game-name";
import {
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
import { routing } from "@/i18n/routing";
import type { GameDetails } from "@/types/game-details";

type GamePageProps = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    gameDetailSlugs.map((slug) => ({ locale, slug })),
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
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const routeAppId = parseGameRouteAppId(slug);

  if (routeAppId !== null) {
    const storeMetadata = await withPromiseTimeout(
      getSteamStoreAppDetails(routeAppId).catch(() => null),
      null,
    );
    const title = storeMetadata?.name ?? `Steam App ${routeAppId}`;
    return {
      title: t("gameDetailsTitle", { title }),
      description: t("gameDetailsDescription", { title }),
    };
  }

  const details = getGameDetails(slug);

  if (!details) {
    const title = slug
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
    return { title: t("gameDetailsTitle", { title }) };
  }

  return {
    title: t("gameDetailsTitle", { title: details.game.title }),
    description: t("gameDetailsDescription", { title: details.game.title }),
  };
}

export default async function GamePage({ params, searchParams }: GamePageProps) {
  const { locale, slug: routeParam } = await params;
  const resolvedSearchParams = await searchParams;
  const reviewsQuery = parseGameReviewsQuery(resolvedSearchParams);
  setRequestLocale(locale);

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
      ? getGameDbCommunitySnapshot(gameAppId, {
          unavailable,
          formatPlaytime: formatters.formatPlaytime,
        })
      : Promise.resolve({
          ownerCount: 0,
          averagePlaytimeMinutes: null,
          averageCompletion: null,
          perfectGamesCount: 0,
          leaderboard: [],
        }),
    isAuthenticated && steamId && gameAppId !== null
      ? getUserGamePosition(gameAppId, steamId, {
          formatPlaytime: formatters.formatPlaytime,
        })
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

  const reviewsData =
    resolvedAppId !== null
      ? await loadGameReviewsPage({
          appId: resolvedAppId,
          gameName: personalizedDetails.game.title,
          page: reviewsQuery.page,
          sort: reviewsQuery.sort,
          filter: reviewsQuery.filter,
          viewerSteamId: steamId ?? null,
        })
      : null;

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
              gameAppId={resolvedAppId}
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
                gameSlug={personalizedDetails.game.slug}
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

            {reviewsData && resolvedAppId !== null ? (
              <section>
                <SectionHeading
                  eyebrow={tGameDetails("sections.reviewsEyebrow")}
                  title={tGameDetails("sections.reviewsTitle")}
                />
                <GameReviewsSection
                  appId={resolvedAppId}
                  gameName={personalizedDetails.game.title}
                  initialData={reviewsData}
                  isAuthenticated={isAuthenticated}
                  locale={locale}
                  sort={reviewsQuery.sort}
                  filter={reviewsQuery.filter}
                  page={reviewsQuery.page}
                />
              </section>
            ) : null}

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
