import { slugifyGameName } from "@/lib/slugify-game-name";
import type { Game } from "@/types/game";

const rankedGameData = [
  ["Counter-Strike 2", "730", "FPS"],
  ["Dota 2", "570", "MOBA"],
  ["PUBG: BATTLEGROUNDS", "578080", "Battle Royale"],
  ["Apex Legends", "1172470", "Battle Royale"],
  ["Rust", "252490", "Survival"],
  ["GTA V", "271590", "Action"],
  ["Tom Clancy's Rainbow Six Siege", "359550", "FPS"],
  ["Team Fortress 2", "440", "FPS"],
  ["War Thunder", "236390", "Simulation"],
  ["Destiny 2", "1085660", "Action"],
  ["Terraria", "105600", "Adventure"],
  ["Garry's Mod", "4000", "Sandbox"],
  ["Stardew Valley", "413150", "Simulation"],
  ["The Witcher 3", "292030", "RPG"],
  ["Left 4 Dead 2", "550", "FPS"],
  ["Portal 2", "620", "Puzzle"],
  ["Euro Truck Simulator 2", "227300", "Simulation"],
] as const;

export const rankedGames: Game[] = rankedGameData.map(
  ([title, steamAppId, category]) => {
    const slug = slugifyGameName(title);

    return {
      id: steamAppId,
      title,
      slug,
      imageUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${steamAppId}/header.jpg`,
      category,
    };
  },
);
