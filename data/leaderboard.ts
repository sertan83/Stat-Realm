import { exploreGames } from "@/data/explore-games";
import { rankedGames } from "@/data/ranked-games";
import type { LeaderboardPlayer } from "@/types/leaderboard";

const namePrefixes = [
  "Astral",
  "Crimson",
  "Nova",
  "Iron",
  "Echo",
  "Silent",
  "Pixel",
  "Arcane",
  "Frost",
  "Realm",
];

const nameSuffixes = [
  "Knight",
  "Fox",
  "Reign",
  "Warden",
  "Vanguard",
  "Orbit",
  "Nomad",
  "Wolf",
  "Byte",
  "Runner",
];

const countries = [
  ["United States", "🇺🇸"],
  ["Germany", "🇩🇪"],
  ["United Kingdom", "🇬🇧"],
  ["Canada", "🇨🇦"],
  ["Japan", "🇯🇵"],
  ["France", "🇫🇷"],
  ["Brazil", "🇧🇷"],
  ["Sweden", "🇸🇪"],
  ["Australia", "🇦🇺"],
  ["South Korea", "🇰🇷"],
] as const;

export const leaderboardPlayers: LeaderboardPlayer[] = Array.from(
  { length: 100 },
  (_, index) => {
    const prefix = namePrefixes[index % namePrefixes.length];
    const suffix =
      nameSuffixes[Math.floor(index / namePrefixes.length) % nameSuffixes.length];
    const [country, countryFlag] = countries[index % countries.length];
    const username = `${prefix}${suffix}${index + 1}`;

    return {
      steamId: `76561198${String(100000000 + index).slice(1)}`,
      username,
      initials: `${prefix[0]}${suffix[0]}`,
      country,
      countryFlag,
      hoursPlayed: 4820 - index * 31,
      totalGames: 220 - index,
      achievements: 1875 - index * 11,
      completion: Math.max(54.2, 99.9 - index * 0.43),
      perfectGame: index < 18 || index % 9 === 0,
      steamLevel: 350 - index * 2,
      lastUpdated:
        index % 3 === 0
          ? "2 min ago"
          : index % 3 === 1
            ? "12 min ago"
            : "1 hour ago",
    };
  },
);

const uniqueExploreGames = exploreGames.filter(
  (game, index, games) =>
    games.findIndex((candidate) => candidate.title === game.title) === index,
);

const genreOverrides: Record<string, string> = {
  "Counter-Strike 2": "FPS",
  "Dota 2": "Strategy",
  "PUBG: BATTLEGROUNDS": "Survival",
  "Apex Legends": "FPS",
  Rust: "Survival",
  "GTA V": "Open World",
  "Grand Theft Auto V": "Open World",
  "Elden Ring": "Souls-like",
  "Cyberpunk 2077": "Open World",
  "Baldur's Gate 3": "RPG",
  "The Witcher 3": "RPG",
  "The Witcher 3: Wild Hunt": "RPG",
  "Portal 2": "Puzzle",
  Hades: "Roguelike",
  "Hollow Knight": "Indie",
  "Stardew Valley": "Simulation",
  "Dead Cells": "Roguelike",
  Terraria: "Adventure",
  "Euro Truck Simulator 2": "Simulation",
  "Left 4 Dead 2": "FPS",
  "Garry's Mod": "Sandbox",
  "Destiny 2": "MMORPG",
};

export const leaderboardGames = [...uniqueExploreGames, ...rankedGames]
  .filter(
    (game, index, games) =>
      games.findIndex((candidate) => candidate.title === game.title) === index,
  )
  .map((game) => ({
    ...game,
    category: genreOverrides[game.title] ?? game.category,
  }));

export const leaderboardGenres = [
  "Action",
  "Adventure",
  "RPG",
  "FPS",
  "Strategy",
  "Simulation",
  "Survival",
  "Open World",
  "Souls-like",
  "Roguelike",
  "Puzzle",
  "Sandbox",
  "MMORPG",
  "Sports",
  "Racing",
  "Indie",
];
