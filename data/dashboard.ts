import { featuredGames } from "@/data/games";
import type {
  DashboardGame,
  DashboardMetric,
} from "@/types/dashboard";

export const dashboardMetrics: DashboardMetric[] = [
  {
    label: "Total Games",
    value: "Unavailable",
    icon: "◆",
    detail: "Steam library unavailable",
  },
  {
    label: "Total Playtime",
    value: "Unavailable",
    icon: "◷",
    detail: "Steam playtime unavailable",
  },
  {
    label: "Total Achievements",
    value: "Unavailable",
    icon: "★",
    detail: "Requires a full achievement sync",
  },
  {
    label: "Achievement Completion Rate",
    value: "Unavailable",
    icon: "◎",
    detail: "Requires a full achievement sync",
  },
  {
    label: "Perfect Games",
    value: "Unavailable",
    icon: "♛",
    detail: "Requires a full achievement sync",
  },
  {
    label: "Average Playtime per Game",
    value: "Unavailable",
    icon: "◫",
    detail: "Steam playtime unavailable",
  },
  {
    label: "Average Achievement Rarity",
    value: "Unavailable",
    icon: "✦",
    detail: "Requires global achievement data",
  },
  {
    label: "Global Rank",
    value: "Unavailable",
    icon: "▲",
    detail: "Will be available after StatRealm has enough users.",
  },
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

