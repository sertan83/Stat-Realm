export type ReviewSortOption =
  | "mostHelpful"
  | "highestRated"
  | "lowestRated"
  | "newest"
  | "oldest";

export type ReviewFilterOption =
  | "all"
  | "reviewsWithText"
  | "ratingsOnly"
  | "ratings8Plus"
  | "ratingsBelow5";

export type GameReviewEntry = {
  ratingKey: string;
  steamId: string;
  appId: number;
  gameName: string;
  displayName: string;
  avatarUrl: string;
  profileUrl: string;
  steamLevel: number | null;
  rating: number;
  reviewText: string | null;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  helpfulCount: number;
  hasVotedHelpful: boolean;
};

export type GameReviewsSummary = {
  averageRating: number;
  totalRatings: number;
  totalReviews: number;
  distribution: number[];
};

export type GameReviewsPage = {
  summary: GameReviewsSummary;
  reviews: GameReviewEntry[];
  totalMatchingReviews: number;
  page: number;
  pageSize: number;
  totalPages: number;
  currentUserRating: {
    rating: number;
    reviewText: string | null;
    ratingKey: string;
  } | null;
};

export type UserProfileReviewEntry = GameReviewEntry;

export type UserProfileReviewsPage = {
  reviews: UserProfileReviewEntry[];
  totalReviews: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type CommunityReviewEntry = GameReviewEntry & {
  gameHeaderImageUrl: string;
};

export type CommunityReviewsPageData = {
  reviews: CommunityReviewEntry[];
  totalReviews: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type UserRatingEntry = {
  appId: number;
  gameName: string;
  imageUrl: string;
  rating: number;
  createdAt: string;
};

export type UserRatingsPageData = {
  ratings: UserRatingEntry[];
  totalRatings: number;
};

export type CommunityRatingEntry = {
  appId: number;
  gameName: string;
  capsuleImageUrl: string;
  averageRating: number;
  totalRatings: number;
  totalReviews: number;
};

export type CommunityRatingsPageData = {
  ratings: CommunityRatingEntry[];
  totalGames: number;
};
