import { featuredGames } from "@/data/games";
import type {
  DashboardGame,
  DashboardMetricKey,
} from "@/types/dashboard";

export const dashboardMetricTemplates: Array<{
  key: DashboardMetricKey;
  icon: string;
}> = [
  { key: "totalGames", icon: "◆" },
  { key: "totalPlaytime", icon: "◷" },
  { key: "totalAchievements", icon: "★" },
  { key: "achievementCompletionRate", icon: "◎" },
  { key: "perfectGames", icon: "♛" },
  { key: "averagePlaytimePerGame", icon: "◫" },
  { key: "averageAchievementRarity", icon: "✦" },
  { key: "globalRank", icon: "▲" },
];

const recentGameDetails = [
  { playtime: "186.4h", lastPlayed: "Today", completion: 78 },
  { playtime: "142.7h", lastPlayed: "Yesterday", completion: 64 },
  { playtime: "98.2h", lastPlayed: "3 days ago", completion: 91 },
  { playtime: "76.5h", lastPlayed: "5 days ago", completion: 83 },
  { playtime: "221.8h", lastPlayed: "1 week ago", completion: 72 },
];

export const recentlyPlayedGames: DashboardGame[] = featuredGames
  .slice(0, 5)
  .map((game, index) => ({
    ...game,
    ...recentGameDetails[index],
  }));

export const mostPlayedGames: DashboardGame[] = [
  {
    ...featuredGames[4],
    playtime: "421.8h",
    lastPlayed: "1 week ago",
    completion: 72,
  },
  {
    ...featuredGames[0],
    playtime: "386.4h",
    lastPlayed: "Today",
    completion: 78,
  },
  {
    ...featuredGames[5],
    playtime: "312.6h",
    lastPlayed: "2 weeks ago",
    completion: 96,
  },
  {
    ...featuredGames[1],
    playtime: "242.7h",
    lastPlayed: "Yesterday",
    completion: 64,
  },
  {
    ...featuredGames[7],
    playtime: "208.9h",
    lastPlayed: "4 days ago",
    completion: 58,
  },
];
