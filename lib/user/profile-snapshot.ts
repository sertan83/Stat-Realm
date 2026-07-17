import "server-only";

import type { UserLibraryGame } from "@/lib/db/types";
import { slugifyGameName } from "@/lib/slugify-game-name";
import {
  formatLastPlayed,
  formatPlaytime,
} from "@/lib/steam/api";
import type { IntlFormatters } from "@/lib/i18n/formatters";
import { enrichDashboardGamesWithSteamImages } from "@/lib/steam/game-images";
import type {
  CompletionOverview,
  DashboardGame,
  GenrePlaytime,
} from "@/types/dashboard";

export function buildCompletionOverviewFromAchievementSummary(
  summary: {
    progressByAppId: Map<
      number,
      {
        unlocked: number;
        total: number;
      }
    >;
  },
): CompletionOverview | null {
  const gamesWithAchievements = Array.from(
    summary.progressByAppId.values(),
  ).filter((progress) => progress.total > 0);

  if (gamesWithAchievements.length === 0) {
    return null;
  }

  const completedGames = gamesWithAchievements.filter(
    (progress) => progress.unlocked === progress.total,
  ).length;
  const inProgressGames = gamesWithAchievements.filter(
    (progress) =>
      progress.unlocked > 0 && progress.unlocked < progress.total,
  ).length;
  const untouchedGames =
    gamesWithAchievements.length - completedGames - inProgressGames;

  return {
    completed: (completedGames / gamesWithAchievements.length) * 100,
    inProgress: (inProgressGames / gamesWithAchievements.length) * 100,
    untouched: (untouchedGames / gamesWithAchievements.length) * 100,
  };
}

export function buildCompletionOverviewFromLibrary(
  library: UserLibraryGame[],
): CompletionOverview | null {
  const gamesWithAchievements = library.filter(
    (game) =>
      game.achievementsTotal !== null &&
      game.achievementsTotal > 0,
  );

  if (gamesWithAchievements.length === 0) {
    return null;
  }

  const completedGames = gamesWithAchievements.filter(
    (game) =>
      game.perfectGame === true ||
      game.completionPercentage === 100,
  ).length;
  const inProgressGames = gamesWithAchievements.filter((game) => {
    const unlocked = game.achievementsUnlocked ?? 0;

    return (
      unlocked > 0 &&
      game.perfectGame !== true &&
      game.completionPercentage !== 100
    );
  }).length;
  const untouchedGames =
    gamesWithAchievements.length - completedGames - inProgressGames;

  return {
    completed: (completedGames / gamesWithAchievements.length) * 100,
    inProgress: (inProgressGames / gamesWithAchievements.length) * 100,
    untouched: (untouchedGames / gamesWithAchievements.length) * 100,
  };
}

export function toDashboardGameFromLibraryGame(
  game: UserLibraryGame,
  formatters?: IntlFormatters,
  steamGameCategory = "Steam Game",
): DashboardGame {
  return {
    id: String(game.appId),
    title: game.name,
    slug: slugifyGameName(game.name),
    imageUrl: "",
    category: steamGameCategory,
    playtime: formatters
      ? formatters.formatPlaytime(game.playtimeMinutes)
      : formatPlaytime(game.playtimeMinutes),
    lastPlayed:
      game.lastPlayedAt !== null && game.lastPlayedAt > 0
        ? formatters
          ? formatters.formatLastPlayed(game.lastPlayedAt)
          : formatLastPlayed(game.lastPlayedAt)
        : formatters
          ? formatters.unavailable()
          : "Unavailable",
    completion: game.completionPercentage,
    completionStatus:
      game.achievementsTotal === 0
        ? "unsupported"
        : game.achievementsUnlocked === null
          ? "unavailable"
          : "complete",
  };
}

export async function buildRecentlyPlayedFromLibrary(
  library: UserLibraryGame[],
  formatters?: IntlFormatters,
  steamGameCategory?: string,
): Promise<DashboardGame[]> {
  const mapGame = (game: UserLibraryGame) =>
    toDashboardGameFromLibraryGame(game, formatters, steamGameCategory);

  const recentlyPlayed = [...library]
    .filter(
      (game) =>
        game.lastPlayedAt !== null &&
        game.lastPlayedAt > 0,
    )
    .sort(
      (first, second) =>
        (second.lastPlayedAt ?? 0) - (first.lastPlayedAt ?? 0),
    )
    .slice(0, 5)
    .map(mapGame);

  const baseGames =
    recentlyPlayed.length > 0
      ? recentlyPlayed
      : [...library]
          .filter((game) => game.playtimeTwoWeeksMinutes > 0)
          .sort(
            (first, second) =>
              second.playtimeTwoWeeksMinutes - first.playtimeTwoWeeksMinutes,
          )
          .slice(0, 5)
          .map(mapGame);

  return enrichDashboardGamesWithSteamImages(baseGames);
}

export async function buildMostPlayedFromLibrary(
  library: UserLibraryGame[],
  formatters?: IntlFormatters,
  steamGameCategory?: string,
): Promise<DashboardGame[]> {
  const games = [...library]
    .sort((first, second) => second.playtimeMinutes - first.playtimeMinutes)
    .slice(0, 10)
    .map((game) =>
      toDashboardGameFromLibraryGame(game, formatters, steamGameCategory),
    );

  return enrichDashboardGamesWithSteamImages(games);
}

export function normalizeStoredGenrePlaytime(
  genres: GenrePlaytime[] | null | undefined,
): GenrePlaytime[] | null {
  if (!genres || genres.length === 0) {
    return null;
  }

  return genres.map((genre) => ({
    genre: genre.genre,
    hours: genre.hours,
    percentage: genre.percentage,
  }));
}
