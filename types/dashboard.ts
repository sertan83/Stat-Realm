import type { Game } from "@/types/game";

export type DashboardMetricKey =
  | "totalGames"
  | "totalPlaytime"
  | "totalAchievements"
  | "achievementCompletionRate"
  | "perfectGames"
  | "averagePlaytimePerGame"
  | "averageAchievementRarity"
  | "globalRank";

export type DashboardMetric = {
  key: DashboardMetricKey;
  label: string;
  value: string;
  icon: string;
  detail: string;
};

export type DashboardGame = Game & {
  playtime: string;
  lastPlayed: string;
  completion: number | null;
  completionStatus?: "complete" | "unsupported" | "unavailable";
  imageFallbackUrl?: string;
};

export type DashboardAchievement = {
  id: string;
  iconUrl: string;
  name: string;
  game: string;
  unlockedAt: number;
};

export type GenrePlaytime = {
  genre: string;
  percentage: number;
  hours: string;
};

export type CompletionOverview = {
  completed: number;
  inProgress: number;
  untouched: number;
};
