export const STEAM_ID_PATTERN = /^\d{17}$/;

export type AuthenticatedShellUser = {
  name: string;
  image?: string | null;
  steamId: string;
};

export function isValidSteamId(
  steamId: string | null | undefined,
): steamId is string {
  return typeof steamId === "string" && STEAM_ID_PATTERN.test(steamId);
}

export function resolveAuthenticatedShellUser(sessionUser: {
  name?: string | null;
  image?: string | null;
  steamId?: string | null;
  id?: string | null;
} | null | undefined): AuthenticatedShellUser | null {
  const steamId = sessionUser?.steamId ?? sessionUser?.id ?? null;

  if (!isValidSteamId(steamId)) {
    return null;
  }

  return {
    name: sessionUser?.name?.trim() || steamId,
    image: sessionUser?.image,
    steamId,
  };
}

export function getAuthenticatedDashboardPath(): "/dashboard" {
  return "/dashboard";
}

export function getAuthenticatedProfilePath(
  steamId: string,
): `/user/${string}` {
  return `/user/${steamId}`;
}

export function isAuthenticatedProfilePath(
  pathname: string,
  steamId: string | null | undefined,
) {
  if (!isValidSteamId(steamId)) {
    return false;
  }

  const profilePath = getAuthenticatedProfilePath(steamId);
  return pathname === profilePath || pathname.startsWith(`${profilePath}/`);
}

export function isAuthenticatedDashboardPath(pathname: string) {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

export function isAuthenticatedHomePath(
  pathname: string,
  steamId: string | null | undefined,
) {
  return (
    isAuthenticatedDashboardPath(pathname) ||
    isAuthenticatedProfilePath(pathname, steamId)
  );
}
