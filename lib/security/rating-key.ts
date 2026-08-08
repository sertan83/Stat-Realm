import "server-only";

const STEAM_ID_PATTERN = /^\d{17}$/;

export function parseRatingKey(ratingKey: string, expectedAppId: number) {
  const match = ratingKey.match(/^(\d{17}):(\d+)$/);

  if (!match) {
    throw new Error("INVALID_RATING_KEY");
  }

  const ratingSteamId = match[1];
  const appId = Number(match[2]);

  if (
    !STEAM_ID_PATTERN.test(ratingSteamId) ||
    !Number.isInteger(appId) ||
    appId <= 0 ||
    appId !== expectedAppId
  ) {
    throw new Error("INVALID_RATING_KEY");
  }

  return { ratingSteamId, appId };
}
