import "server-only";

import {
  fetchAchievementProgressResult,
  fetchAchievementSchemaResult,
  fetchGlobalAchievementPercentagesResult,
  type SteamAchievementProgressResult,
  type SteamAchievementSchemaResult,
  type SteamGameAchievement,
  type SteamGlobalPercentagesResult,
} from "@/lib/steam/api";

export type GameAchievementsDetailsResult = {
  achievements: SteamGameAchievement[];
  dataSource: "personal" | "global";
  status: "complete" | "empty" | "unavailable";
};

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function retryResultOnce<T extends { status: string }>(
  operation: () => Promise<T>,
): Promise<T> {
  const first = await operation();

  if (first.status === "unavailable") {
    await sleep(400);
    return operation();
  }

  return first;
}

function sortByGlobalRarity(achievements: SteamGameAchievement[]) {
  return [...achievements].sort((first, second) => {
    const firstPercentage =
      first.globalUnlockPercentage ?? Number.POSITIVE_INFINITY;
    const secondPercentage =
      second.globalUnlockPercentage ?? Number.POSITIVE_INFINITY;
    return firstPercentage - secondPercentage;
  });
}

async function resolveAchievementSchema(
  appId: number,
  progress: SteamAchievementProgressResult | null,
): Promise<SteamAchievementSchemaResult> {
  let schema = await retryResultOnce(() =>
    fetchAchievementSchemaResult(appId),
  );

  if (schema.status === "complete" && schema.achievements.size > 0) {
    return schema;
  }

  if (schema.status === "empty") {
    return schema;
  }

  await sleep(800);
  schema = await fetchAchievementSchemaResult(appId);

  if (schema.status === "complete" && schema.achievements.size > 0) {
    return schema;
  }

  if (schema.status === "empty") {
    return schema;
  }

  if (progress?.status === "unsupported") {
    return { status: "empty" };
  }

  if (schema.status === "complete") {
    return schema;
  }

  return { status: "unavailable" };
}

function buildPersonalAchievements(
  schema: Extract<SteamAchievementSchemaResult, { status: "complete" }>,
  progress: Extract<SteamAchievementProgressResult, { status: "complete" }>,
  globalPercentages: SteamGlobalPercentagesResult,
): SteamGameAchievement[] {
  const playerAchievements = new Map(
    progress.progress.achievements.map((achievement) => [
      achievement.apiname.toLocaleLowerCase(),
      achievement,
    ]),
  );
  const percentages =
    globalPercentages.status === "complete"
      ? globalPercentages.percentages
      : new Map<string, number>();

  return sortByGlobalRarity(
    Array.from(schema.achievements.values()).map((achievement) => {
      const playerAchievement = playerAchievements.get(
        achievement.apiName.toLocaleLowerCase(),
      );
      const isUnlocked = playerAchievement?.achieved === 1;
      const globalUnlockPercentage = percentages.get(
        achievement.apiName.toLocaleLowerCase(),
      );

      return {
        apiName: achievement.apiName,
        name: achievement.name,
        description: achievement.description,
        iconUrl: isUnlocked
          ? achievement.iconUrl
          : achievement.lockedIconUrl,
        isUnlocked: Boolean(isUnlocked),
        unlockTime:
          isUnlocked && (playerAchievement?.unlocktime ?? 0) > 0
            ? playerAchievement?.unlocktime
            : undefined,
        globalUnlockPercentage,
      };
    }),
  );
}

function buildGlobalAchievements(
  schema: Extract<SteamAchievementSchemaResult, { status: "complete" }>,
  globalPercentages: SteamGlobalPercentagesResult,
): SteamGameAchievement[] {
  const percentages =
    globalPercentages.status === "complete"
      ? globalPercentages.percentages
      : new Map<string, number>();

  return sortByGlobalRarity(
    Array.from(schema.achievements.values()).map((achievement) => ({
      apiName: achievement.apiName,
      name: achievement.name,
      description: achievement.description,
      iconUrl: achievement.lockedIconUrl,
      isUnlocked: false,
      unlockTime: undefined,
      globalUnlockPercentage: percentages.get(
        achievement.apiName.toLocaleLowerCase(),
      ),
    })),
  );
}

export async function getGameAchievementsForDetails(
  appId: number,
  options: {
    steamId?: string;
    ownsGame?: boolean;
  } = {},
): Promise<GameAchievementsDetailsResult> {
  const ownsGame = Boolean(options.ownsGame && options.steamId);
  const progress =
    ownsGame && options.steamId
      ? await retryResultOnce(() =>
          fetchAchievementProgressResult(options.steamId!, appId),
        )
      : null;
  const [schema, globalPercentages] = await Promise.all([
    resolveAchievementSchema(appId, progress),
    retryResultOnce(() => fetchGlobalAchievementPercentagesResult(appId)),
  ]);

  if (schema.status === "empty") {
    return {
      achievements: [],
      dataSource: ownsGame ? "personal" : "global",
      status: "empty",
    };
  }

  if (schema.status !== "complete" || schema.achievements.size === 0) {
    return {
      achievements: [],
      dataSource: ownsGame ? "personal" : "global",
      status: "unavailable",
    };
  }

  if (ownsGame && progress?.status === "complete") {
    return {
      achievements: buildPersonalAchievements(
        schema,
        progress,
        globalPercentages,
      ),
      dataSource: "personal",
      status: "complete",
    };
  }

  return {
    achievements: buildGlobalAchievements(schema, globalPercentages),
    dataSource: "global",
    status: "complete",
  };
}
