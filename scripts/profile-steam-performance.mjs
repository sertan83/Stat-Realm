import { performance } from "node:perf_hooks";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(filename) {
  try {
    const envPath = resolve(process.cwd(), filename);
    const contents = readFileSync(envPath, "utf8");

    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) continue;

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim();

      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // Optional local env files.
  }
}

async function timeOperation(label, operation) {
  const startedAt = performance.now();
  await operation();
  const durationMs = Math.round(performance.now() - startedAt);
  console.log(`${label}: ${durationMs}ms`);
  return durationMs;
}

async function main() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  const steamId = process.env.PROFILE_STEAM_ID;
  if (!steamId) {
    console.error("Set PROFILE_STEAM_ID in .env.local to run profiling.");
    process.exit(1);
  }

  const {
    getOwnedGames,
    getAuthenticatedSteamProfile,
    getRecentlyPlayedGames,
    getSteamLevel,
    getGameAchievements,
    getAchievementProgress,
  } = await import("../lib/steam/api.ts");
  const { fetchStoreAppData } = await import("../lib/steam/store-app-cache.ts");
  const { getSteamStoreAppDetails } = await import(
    "../lib/steam/store-app-details.ts"
  );
  const { resolveSteamExploreCardImage } = await import(
    "../lib/steam/game-images.ts"
  );
  const { fetchExploreCatalog } = await import(
    "../lib/steam/store-catalog.ts"
  );
  const { getGenrePlaytimeSummary } = await import("../lib/steam/genre-sync.ts");
  const { getAchievementLibrarySummary } = await import(
    "../lib/steam/achievement-sync.ts"
  );

  console.log("StatRealm Steam performance profile\n");

  const profileMs = await timeOperation("Steam profile", () =>
    getAuthenticatedSteamProfile(steamId),
  );
  const ownedGames = await getOwnedGames(steamId);
  const ownedMs = await timeOperation("Owned games library", async () => ownedGames);
  const recentMs = await timeOperation("Recently played", () =>
    getRecentlyPlayedGames(steamId, 8),
  );
  const levelMs = await timeOperation("Steam level", () => getSteamLevel(steamId));

  const sampleAppId = ownedGames[0]?.appid ?? 570;
  const storeAppMs = await timeOperation("Store appdetails (cold)", () =>
    fetchStoreAppData(sampleAppId),
  );
  const storeAppCachedMs = await timeOperation("Store appdetails (cached)", () =>
    fetchStoreAppData(sampleAppId),
  );
  const storeDetailsMs = await timeOperation("Store app metadata parse", () =>
    getSteamStoreAppDetails(sampleAppId),
  );
  const achievementMs = await timeOperation("Single game achievements", () =>
    getGameAchievements(steamId, sampleAppId),
  );
  const progressMs = await timeOperation("Single game achievement progress", () =>
    getAchievementProgress(steamId, sampleAppId),
  );
  const exploreImageMs = await timeOperation("Explore card image resolve", () =>
    resolveSteamExploreCardImage(sampleAppId, {
      gameTitle: ownedGames[0]?.name ?? "Sample Game",
    }),
  );
  const exploreCatalogMs = await timeOperation("Explore catalog page 1", () =>
    fetchExploreCatalog({
      page: 1,
      term: "",
      genre: "",
      platform: "",
      sortBy: "",
      hideDlc: true,
    }),
  );

  const syncVersion = String(Date.now());
  const genreMs = await timeOperation("Genre playtime summary", () =>
    getGenrePlaytimeSummary(steamId, ownedGames, syncVersion),
  );
  const achievementSummaryMs = await timeOperation(
    "Achievement library summary",
    () => getAchievementLibrarySummary(steamId, ownedGames, syncVersion),
  );

  const dashboardEstimate =
    profileMs +
    ownedMs +
    recentMs +
    levelMs +
    Math.max(genreMs, achievementSummaryMs);

  console.log("\nEstimated dashboard cold-load core work:", `${dashboardEstimate}ms`);
  console.log("Store appdetails cache speedup:", `${storeAppMs - storeAppCachedMs}ms saved`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
