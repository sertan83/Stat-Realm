import type { Game } from "@/types/game";
import { featuredGames } from "@/data/games";

export type WeeklyFeatured = {
  game: Game;
  description: string;
};

export const weeklyFeatured: WeeklyFeatured = {
  game: featuredGames[0],
  description:
    "Explore the Lands Between in FromSoftware's acclaimed open-world action RPG.",
};
