export const GAME_NAME_LOADING_LABEL = "Loading...";

export function isPlaceholderGameName(
  name: string | null | undefined,
  appId: number,
): boolean {
  if (!name?.trim()) {
    return true;
  }

  return name.trim() === `Steam App ${appId}`;
}

export function sanitizeStoredGameName(
  name: string | null | undefined,
  appId: number,
): string {
  if (isPlaceholderGameName(name, appId)) {
    return "";
  }

  return name?.trim() ?? "";
}
