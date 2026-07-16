import type {
  LeaderboardPlayer,
  LeaderboardSort,
  SteamLeaderboardGame,
} from "@/types/leaderboard";

function compareNullableNumber(
  left: number | null,
  right: number | null,
): number {
  if (left === null && right === null) {
    return 0;
  }

  if (left === null) {
    return 1;
  }

  if (right === null) {
    return -1;
  }

  return right - left;
}

function comparePerfectGame(
  left: boolean | null,
  right: boolean | null,
): number {
  if (left === right) {
    return 0;
  }

  if (left === true) {
    return -1;
  }

  if (right === true) {
    return 1;
  }

  if (left === false) {
    return -1;
  }

  if (right === false) {
    return 1;
  }

  return 0;
}

export function sortLeaderboardPlayers(
  players: LeaderboardPlayer[],
  sortBy: LeaderboardSort,
): LeaderboardPlayer[] {
  return [...players].sort((left, right) => {
    switch (sortBy) {
      case "Steam Level":
        return compareNullableNumber(left.steamLevel, right.steamLevel);
      case "Total Games":
        return compareNullableNumber(left.totalGames, right.totalGames);
      case "Achievement Completion":
        return compareNullableNumber(left.completion, right.completion);
      case "Achievements Unlocked":
        return compareNullableNumber(left.achievements, right.achievements);
      case "Perfect Games":
        return comparePerfectGame(left.perfectGame, right.perfectGame);
      case "Average Playtime":
        return compareNullableNumber(left.hoursPlayed, right.hoursPlayed);
      default:
        return compareNullableNumber(left.hoursPlayed, right.hoursPlayed);
    }
  });
}

export function buildFilteredLeaderboardValues(
  matchingGames: SteamLeaderboardGame[],
  options: {
    period: string;
    sortBy: string;
  },
): {
  hoursPlayed: number | null;
  achievements: number | null;
  completion: number | null;
  perfectGame: boolean | null;
} {
  let totalMinutes: number | null =
    options.period === "All Time"
      ? matchingGames.reduce((total, item) => total + item.playtimeMinutes, 0)
      : null;

  if (options.sortBy === "Hours Played (Last 2 Weeks)") {
    totalMinutes = matchingGames.reduce(
      (total, item) => total + item.playtimeTwoWeeksMinutes,
      0,
    );
  } else if (options.sortBy === "Hours Played (Last 30 Days)") {
    totalMinutes = null;
  }

  const gamesReportingAchievements = matchingGames.filter(
    (item) => item.achievements !== null,
  );
  const gamesWithTotals = matchingGames.filter(
    (item) =>
      item.achievementsTotal !== null && (item.achievementsTotal ?? 0) > 0,
  );

  const achievements =
    gamesReportingAchievements.length > 0
      ? gamesReportingAchievements.reduce(
          (total, item) => total + (item.achievements ?? 0),
          0,
        )
      : null;
  const totalUnlocked = gamesWithTotals.reduce(
    (total, item) => total + (item.achievements ?? 0),
    0,
  );
  const totalAvailable = gamesWithTotals.reduce(
    (total, item) => total + (item.achievementsTotal ?? 0),
    0,
  );
  const completion =
    totalAvailable > 0 ? (totalUnlocked / totalAvailable) * 100 : null;
  const gamesWithPerfectData = matchingGames.filter(
    (item) => item.perfectGame !== null,
  );
  const perfectGame =
    gamesWithPerfectData.length > 0
      ? matchingGames.some((item) => item.perfectGame === true)
      : null;

  return {
    hoursPlayed:
      totalMinutes === null
        ? null
        : Math.round((totalMinutes / 60) * 10) / 10,
    achievements,
    completion,
    perfectGame,
  };
}
