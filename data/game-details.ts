import { exploreGames } from "@/data/explore-games";
import { rankedGames } from "@/data/ranked-games";
import {
  UNKNOWN_DEVELOPER,
  UNKNOWN_RELEASE_YEAR,
  UNAVAILABLE_REVIEWS,
} from "@/lib/steam/store-metadata-labels";
import { slugifyGameName } from "@/lib/slugify-game-name";
import type { GameDetails, LeaderboardPlayer } from "@/types/game-details";

const developers: Record<string, string> = {
  "Elden Ring": "FromSoftware",
  "Cyberpunk 2077": "CD PROJEKT RED",
  "Baldur's Gate 3": "Larian Studios",
  Hades: "Supergiant Games",
  "Red Dead Redemption 2": "Rockstar Games",
  "The Witcher 3: Wild Hunt": "CD PROJEKT RED",
  "Portal 2": "Valve",
  "Counter-Strike 2": "Valve",
  "Grand Theft Auto V": "Rockstar Games",
  "Stardew Valley": "ConcernedApe",
  "Hollow Knight": "Team Cherry",
  "Dead Cells": "Motion Twin",
  "God of War": "Santa Monica Studio",
  "Hogwarts Legacy": "Avalanche Software",
  "Helldivers 2": "Arrowhead Game Studios",
  "Monster Hunter: World": "CAPCOM",
  "No Man's Sky": "Hello Games",
  "Sekiro: Shadows Die Twice": "FromSoftware",
  "DOOM Eternal": "id Software",
  "Resident Evil 4": "CAPCOM",
  "Control Ultimate Edition": "Remedy Entertainment",
  "Disco Elysium": "ZA/UM",
  "Dave the Diver": "MINTROCKET",
  "Lies of P": "NEOWIZ",
};

const releaseYears: Record<string, number> = {
  "Elden Ring": 2022,
  "Cyberpunk 2077": 2020,
  "Baldur's Gate 3": 2023,
  Hades: 2020,
  "Red Dead Redemption 2": 2019,
  "The Witcher 3: Wild Hunt": 2015,
  "Portal 2": 2011,
  "Counter-Strike 2": 2023,
};

const leaderboard: LeaderboardPlayer[] = [
  { rank: 1, username: "AstralKnight", initials: "AK", hoursPlayed: "2,841h", completion: "100%", fastestCompletion: "18h 42m" },
  { rank: 2, username: "CrimsonFox", initials: "CF", hoursPlayed: "2,406h", completion: "100%", fastestCompletion: "19h 08m" },
  { rank: 3, username: "NovaReign", initials: "NR", hoursPlayed: "2,173h", completion: "99.8%", fastestCompletion: "19h 31m" },
  { rank: 4, username: "IronWarden", initials: "IW", hoursPlayed: "1,954h", completion: "99.2%", fastestCompletion: "20h 04m" },
  { rank: 5, username: "EchoVanguard", initials: "EV", hoursPlayed: "1,782h", completion: "98.9%", fastestCompletion: "20h 47m" },
  { rank: 6, username: "SilentOrbit", initials: "SO", hoursPlayed: "1,669h", completion: "98.5%", fastestCompletion: "21h 16m" },
  { rank: 7, username: "PixelNomad", initials: "PN", hoursPlayed: "1,524h", completion: "97.7%", fastestCompletion: "21h 53m" },
  { rank: 8, username: "ArcaneWolf", initials: "AW", hoursPlayed: "1,431h", completion: "97.1%", fastestCompletion: "22h 20m" },
  { rank: 9, username: "FrostByte", initials: "FB", hoursPlayed: "1,328h", completion: "96.6%", fastestCompletion: "22h 58m" },
  { rank: 10, username: "RealmRunner", initials: "RR", hoursPlayed: "1,205h", completion: "96.0%", fastestCompletion: "23h 35m" },
];

const uniqueGames = exploreGames.filter(
  (game, index, games) =>
    games.findIndex((candidate) => candidate.title === game.title) === index,
);

const allDetailGames = [
  ...uniqueGames,
  ...rankedGames.filter(
    (rankedGame) =>
      !uniqueGames.some((game) => game.slug === rankedGame.slug),
  ),
];

export const gameDetailSlugs = allDetailGames.map((game) => game.slug);

export function createGameDetails(
  game: (typeof allDetailGames)[number],
): GameDetails {
  const currentIndex = allDetailGames.findIndex(
    (candidate) => candidate.title === game.title,
  );
  const similarGames = Array.from({ length: 4 }, (_, offset) => {
    const index =
      (Math.max(0, currentIndex) + offset + 1) % allDetailGames.length;
    return allDetailGames[index];
  });
  const steamAppId = game.imageUrl.match(/\/apps\/(\d+)\//)?.[1];

  return {
    game,
    developer: developers[game.title] ?? UNKNOWN_DEVELOPER,
    releaseYear: releaseYears[game.title] ?? UNKNOWN_RELEASE_YEAR,
    reviewScore: UNAVAILABLE_REVIEWS,
    steamUrl: steamAppId
      ? `https://store.steampowered.com/app/${steamAppId}`
      : "https://store.steampowered.com",
    statistics: [
      { label: "Players Tracked", value: "0" },
      { label: "Average Playtime", value: "0h" },
      { label: "Total Achievements", value: "Unavailable" },
      { label: "Average Completion", value: "0%" },
      { label: "Perfect Games", value: "0" },
    ],
    achievements: [],
    communityStatistics: [
      { label: "Average Playtime", value: "0h" },
      { label: "Most Popular Difficulty", value: "Unavailable" },
      { label: "Average Completion Rate", value: "0%" },
      { label: "Most Common Playstyle", value: "Unavailable" },
    ],
    leaderboard,
    similarGames,
  };
}

export function getGameDetails(slug: string): GameDetails | undefined {
  const game = allDetailGames.find((candidate) => candidate.slug === slug);

  return game ? createGameDetails(game) : undefined;
}

export function createGameDetailsFromSteamApp(
  appId: number,
  name: string,
  slug: string,
): GameDetails {
  return {
    ...createGameDetails({
      id: String(appId),
      title: name,
      slug,
      imageUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`,
      category: "Steam Game",
    }),
    developer: UNKNOWN_DEVELOPER,
    releaseYear: UNKNOWN_RELEASE_YEAR,
    reviewScore: UNAVAILABLE_REVIEWS,
    steamUrl: `https://store.steampowered.com/app/${appId}`,
  };
}

export function createGameDetailsFromAppId(
  appId: number,
  name: string,
  slug?: string,
): GameDetails {
  return createGameDetailsFromSteamApp(
    appId,
    name,
    slug ?? slugifyGameName(name),
  );
}

export function createGameDetailsFromSlug(slug: string): GameDetails {
  const title = slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return {
    ...createGameDetails({
      id: slug,
      title: title || "Steam Game",
      slug,
      imageUrl: "https://store.steampowered.com",
      category: "Steam Game",
    }),
    developer: UNKNOWN_DEVELOPER,
    releaseYear: UNKNOWN_RELEASE_YEAR,
    reviewScore: UNAVAILABLE_REVIEWS,
  };
}
