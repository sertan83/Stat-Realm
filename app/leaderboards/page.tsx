import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { LeaderboardsDashboard } from "@/components/leaderboards/LeaderboardsDashboard";
import { leaderboardGames } from "@/data/leaderboard";
import { auth } from "@/auth";
import { getDbLeaderboardEntries } from "@/lib/leaderboard/db-leaderboard";
import {
  getAuthenticatedSteamProfile,
  getOwnedGamesLibrary,
  getSteamAppIdFromImage,
} from "@/lib/steam/api";
import { syncUserSteamLibrary } from "@/lib/steam/library-sync";

export const metadata: Metadata = {
  title: "Leaderboards — StatRealm",
  description:
    "Compare the world's top Steam players across every game on StatRealm.",
};

function buildCatalogMaps() {
  const catalogAliasesByAppId = leaderboardGames.reduce(
    (aliases, game) => {
      const appId = getSteamAppIdFromImage(game.imageUrl);

      if (appId !== null) {
        aliases.set(appId, [...(aliases.get(appId) ?? []), game.title]);
      }

      return aliases;
    },
    new Map<number, string[]>(),
  );
  const catalogCategoriesByAppId = new Map(
    leaderboardGames.flatMap((game) => {
      const appId = getSteamAppIdFromImage(game.imageUrl);
      return appId === null ? [] : ([[appId, game.category]] as const);
    }),
  );

  return { catalogAliasesByAppId, catalogCategoriesByAppId };
}

export default async function LeaderboardsPage() {
  const session = await auth();
  const isAuthenticated = Boolean(session?.user?.steamId);
  const { catalogAliasesByAppId, catalogCategoriesByAppId } =
    buildCatalogMaps();

  if (isAuthenticated && session?.user?.steamId) {
    const steamId = session.user.steamId;
    const [profileResult, ownedResult] = await Promise.allSettled([
      getAuthenticatedSteamProfile(steamId),
      getOwnedGamesLibrary(steamId),
    ]);
    const profile =
      profileResult.status === "fulfilled" ? profileResult.value : null;
    const hasOwnedGamesData = ownedResult.status === "fulfilled";
    const ownedGames = hasOwnedGamesData ? ownedResult.value.games : [];
    const ownedGameCount = hasOwnedGamesData
      ? ownedResult.value.gameCount
      : 0;

    if (hasOwnedGamesData) {
      await syncUserSteamLibrary(steamId, {
        games: ownedGames,
        profile,
        gameCount: ownedGameCount,
      }).catch((error) => {
        console.error(
          "[StatRealm] Failed to sync Steam library on leaderboards",
          {
            steamId,
            error,
          },
        );
      });
    }
  }

  const dbEntries = await getDbLeaderboardEntries({
    catalogAliasesByAppId,
    catalogCategoriesByAppId,
  });

  return (
    <div className="min-h-screen text-white">
      <Navbar />

      <main className="relative min-h-[calc(100vh-55px)] overflow-hidden px-4 py-12 sm:px-6 lg:px-8">

        <div className="relative z-10 mx-auto w-full max-w-7xl">
          <header>
            <h1 className="text-4xl font-bold tracking-[0.1em] text-white uppercase sm:text-5xl lg:text-6xl">
              Leaderboards
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/65 sm:text-lg">
              Compare the world&apos;s top Steam players across every game.
            </p>
          </header>

          <div className="mt-8">
            <LeaderboardsDashboard
              dbEntries={dbEntries}
              showSignInBanner={!isAuthenticated}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
