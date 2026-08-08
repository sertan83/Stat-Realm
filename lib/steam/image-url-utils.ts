const TRUSTED_STEAM_IMAGE_HOSTS = new Set([
  "cdn.cloudflare.steamstatic.com",
  "shared.cloudflare.steamstatic.com",
  "store.cloudflare.steamstatic.com",
  "cdn.fastly.steamstatic.com",
  "shared.fastly.steamstatic.com",
  "store.fastly.steamstatic.com",
  "cdn.akamai.steamstatic.com",
  "shared.akamai.steamstatic.com",
  "store.akamai.steamstatic.com",
  "store.steampowered.com",
  "media.steampowered.com",
  "steamcdn-a.akamaihd.net",
  "steamuserimages-a.akamaihd.net",
  "steamcommunity-a.akamaihd.net",
  "avatars.steamstatic.com",
  "avatars.fastly.steamstatic.com",
  "avatars.akamai.steamstatic.com",
]);

export function isTrustedSteamImageHost(url?: string | null) {
  if (!url || url.startsWith("/")) {
    return false;
  }

  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return TRUSTED_STEAM_IMAGE_HOSTS.has(hostname);
  } catch {
    return false;
  }
}

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

  return isTrustedSteamImageHost(url) && !isLowResolutionSteamImageUrl(url);
}
