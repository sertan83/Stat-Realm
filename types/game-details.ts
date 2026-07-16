import type { Game } from "@/types/game";

export type DetailMetric = {
  label: string;
  value: string;
};

export type Achievement = {
  apiName: string;
  iconUrl: string;
  name: string;
  description?: string;
  isUnlocked: boolean;
  unlockedAt?: string;
  globalUnlockPercentage?: number;
};

export type LeaderboardPlayer = {
  rank: number;
  steamId?: string;
  username: string;
  initials: string;
  avatarUrl?: string;
  hoursPlayed: string;
  completion: string;
  fastestCompletion: string;
};

export type GameUserPosition = {
  rank: number;
  steamId: string;
  username: string;
  initials: string;
  avatarUrl?: string;
  playtime: string;
  completionPercentage: number | null;
  achievementsUnlocked: number | null;
  achievementsTotal: number | null;
  perfectGame: boolean | null;
  steamLevel: number | null;
  country: string;
  countryFlag: string;
};

export type GameDetails = {
  game: Game;
  developer: string;
  releaseYear: number | string;
  reviewScore: string;
  steamUrl: string;
  statistics: DetailMetric[];
  achievements: Achievement[];
  communityStatistics: DetailMetric[];
  leaderboard: LeaderboardPlayer[];
  similarGames: Game[];
};
