export type StoredUnlockedAchievement = {
  id: string;
  appId: number;
  apiName: string;
  name: string;
  gameName: string;
  iconUrl: string;
  unlockTime: number;
};

export type UserLibraryGame = {
  appId: number;
  name: string;
  playtimeMinutes: number;
  playtimeTwoWeeksMinutes: number;
  lastPlayedAt: number | null;
  achievementsUnlocked: number | null;
  achievementsTotal: number | null;
  completionPercentage: number | null;
  perfectGame: boolean | null;
};

export type StoredProfileAnalytics = {
  genrePlaytime: Array<{
    genre: string;
    hours: string;
    percentage: number;
  }> | null;
  completionOverview: {
    completed: number;
    inProgress: number;
    untouched: number;
  } | null;
  syncedAt: string;
};

export type StatRealmUserStats = {
  totalPlaytimeMinutes: number;
  totalGames: number;
  totalUnlockedAchievements: number | null;
  totalAvailableAchievements: number | null;
  achievementCompletionRate: number | null;
  perfectGames: number | null;
  averageAchievementRarity: number | null;
  achievementTotalsStatus: "complete" | "unavailable";
  achievementRarityStatus: "complete" | "unavailable";
  steamLevel: number | null;
  countryCode: string | null;
};

export type StatRealmUser = {
  steamId: string;
  displayName: string;
  avatar: string;
  avatarMedium: string;
  avatarUrl: string;
  profileUrl: string;
  registeredAt: string;
  lastSyncedAt: string;
  lastLoginAt: string | null;
  stats: StatRealmUserStats;
};

export type MostPlayedAggregate = {
  appId: number;
  name: string;
  totalPlaytimeMinutes: number;
};

export type MostOwnedAggregate = {
  appId: number;
  name: string;
  ownerCount: number;
};

export type CommunityAggregates = {
  mostPlayed: MostPlayedAggregate[];
  mostOwned: MostOwnedAggregate[];
  updatedAt: string | null;
};

export type StoredGameRating = {
  steamId: string;
  appId: number;
  rating: number;
  reviewText: string | null;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
};

export type StoredHelpfulVote = {
  ratingKey: string;
  voterSteamId: string;
  createdAt: string;
};

export type GameRatingAggregate = {
  appId: number;
  gameName: string;
  averageRating: number;
  totalRatings: number;
  totalReviews: number;
  distribution: number[];
  updatedAt: string;
};

export type RatingSubmissionLog = {
  timestamps: string[];
};

export type StatRealmDb = {
  users: Record<string, StatRealmUser>;
  libraries: Record<string, UserLibraryGame[]>;
  achievementHistories: Record<string, StoredUnlockedAchievement[]>;
  profileAnalytics: Record<string, StoredProfileAnalytics>;
  aggregates: CommunityAggregates;
  gameRatings: Record<string, StoredGameRating>;
  helpfulVotes: Record<string, StoredHelpfulVote>;
  ratingAggregates: Record<string, GameRatingAggregate>;
  ratingSubmissionLogs: Record<string, RatingSubmissionLog>;
};
