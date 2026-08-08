import "server-only";

export const MAX_GAME_API_APP_IDS = 24;

export function parseBoundedAppIds(
  searchParams: URLSearchParams,
  maxAppIds = MAX_GAME_API_APP_IDS,
) {
  const rawValue = searchParams.get("appIds");

  if (!rawValue) {
    return [];
  }

  const seen = new Set<number>();

  for (const value of rawValue.split(",")) {
    if (seen.size >= maxAppIds) {
      break;
    }

    const appId = Number(value.trim());

    if (!Number.isInteger(appId) || appId <= 0 || seen.has(appId)) {
      continue;
    }

    seen.add(appId);
  }

  return [...seen];
}
