export type LeaderboardGlobalRank =
  | "Total Playtime"
  | "Games Owned"
  | "Total Achievements";

export type LeaderboardPlayer = {
  steamId: string;
  username: string;
  initials: string;
  avatarUrl?: string;
  country: string;
  countryFlag: string;
  hoursPlayed: number | null;
  totalGames: number | null;
  achievements: number | null;
  completion: number | null;
  perfectGame: boolean | null;
  steamLevel: number | null;
  lastUpdated: string;
};

export type LeaderboardSort =
  | "Total Playtime"
  | "Total Games"
  | "Achievement Completion"
  | "Achievements Unlocked"
  | "Perfect Games"
  | "Steam Level"
  | "Hours Played (Last 2 Weeks)"
  | "Hours Played (Last 30 Days)"
  | "Average Playtime";

export type LeaderboardPeriod =
  | "All Time"
  | "This Year"
  | "Last 90 Days"
  | "Last 30 Days"
  | "Last 7 Days"
  | "Last 24 Hours";

export type SteamLeaderboardGame = {
  appId: number;
  title: string;
  aliases: string[];
  category: string;
  playtimeMinutes: number;
  playtimeTwoWeeksMinutes: number;
  achievements: number | null;
  achievementsTotal: number | null;
  completion: number | null;
  perfectGame: boolean | null;
};

export type SteamLeaderboardIdentity = {
  steamId: string;
  username: string;
  avatarUrl?: string;
  country: string;
  countryFlag: string;
  steamLevel: number | null;
};

export type SyncedLeaderboardStats = {
  globalHoursPlayed: number | null;
  globalTotalGames: number | null;
  globalAchievements: number | null;
  globalCompletion: number | null;
  globalPerfectGame: boolean | null;
  steamLevel: number | null;
  lastUpdated: string;
};

export type DbLeaderboardEntry = {
  identity: SteamLeaderboardIdentity;
  steamGames: SteamLeaderboardGame[];
  syncedStats: SyncedLeaderboardStats;
};
