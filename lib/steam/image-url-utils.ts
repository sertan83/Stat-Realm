export function isLowResolutionSteamImageUrl(url?: string | null) {
  if (!url || url.startsWith("/")) {
    return false;
  }

  try {
    const path = new URL(url).pathname.toLowerCase();

    if (path.includes("tiny_image")) return true;
    if (path.includes("capsule_sm_")) return true;
    if (path.endsWith("/icon.jpg")) return true;
    if (path.endsWith("/capsule_sm_120.jpg")) return true;

    return false;
  } catch {
    return true;
  }
}

export function isCacheableSteamImageUrl(url?: string | null) {
  if (!url || url.startsWith("/")) {
    return false;
  }

  return !isLowResolutionSteamImageUrl(url);
}
