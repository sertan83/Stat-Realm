import "server-only";

import { DEFAULT_GAME_FALLBACK_IMAGE } from "@/lib/steam/image-constants";
import {
  buildPrimaryImageResult,
  reorderCandidatesWithCachedUrl,
} from "@/lib/steam/game-image-cache";
import { fetchStoreAppData } from "@/lib/steam/store-app-cache";
import { appendStoreArtworkCandidates } from "@/lib/steam/store-artwork";
import { isLowResolutionSteamImageUrl } from "@/lib/steam/image-url-utils";
import type { SteamImageCandidate } from "@/types/steam-images";

export type { SteamImageCandidate } from "@/types/steam-images";
export { DEFAULT_GAME_FALLBACK_IMAGE } from "@/lib/steam/image-constants";

const STORE_ASSET_HOSTS = [
  "https://shared.fastly.steamstatic.com",
  "https://shared.akamai.steamstatic.com",
] as const;

const LEGACY_STEAM_CDN = "https://cdn.cloudflare.steamstatic.com";

function getValidCapsuleFilename(value?: string) {
  return value && /^[a-f0-9]+\/[a-zA-Z0-9_.-]+$/.test(value)
    ? value
    : null;
}

function getCapsuleHash(capsuleFilename?: string) {
  const validCapsuleFilename = getValidCapsuleFilename(capsuleFilename);
  if (!validCapsuleFilename) return null;

  const [hash] = validCapsuleFilename.split("/");
  return hash ?? null;
}

function storeAssetUrl(
  host: (typeof STORE_ASSET_HOSTS)[number],
  appId: number,
  filename: string,
) {
  return `${host}/store_item_assets/steam/apps/${appId}/${filename}`;
}

function legacyAppUrl(appId: number, filename: string) {
  return `${LEGACY_STEAM_CDN}/steam/apps/${appId}/${filename}`;
}

function appendStoreAssetVariants(
  candidates: SteamImageCandidate[],
  label: string,
  appId: number,
  filename: string,
) {
  for (const host of STORE_ASSET_HOSTS) {
    candidates.push({
      label,
      url: storeAssetUrl(host, appId, filename),
    });
  }
}

function appendAssetVariants(
  candidates: SteamImageCandidate[],
  label: string,
  appId: number,
  filename: string,
  options: {
    hash?: string | null;
    includeLegacy?: boolean;
  } = {},
) {
  if (options.hash) {
    appendStoreAssetVariants(
      candidates,
      label,
      appId,
      `${options.hash}/${filename}`,
    );
  }

  appendStoreAssetVariants(candidates, label, appId, filename);

  if (options.includeLegacy) {
    candidates.push({
      label,
      url: legacyAppUrl(appId, filename),
    });
  }
}

function dedupeCandidates(candidates: SteamImageCandidate[]) {
  const seen = new Set<string>();

  return candidates.filter((candidate) => {
    if (seen.has(candidate.url)) return false;
    seen.add(candidate.url);
    return true;
  });
}

function appendDefaultFallback(candidates: SteamImageCandidate[]) {
  candidates.push({
    label: "Default fallback",
    url: DEFAULT_GAME_FALLBACK_IMAGE,
  });
}

function appendBannerPriorityAssets(
  candidates: SteamImageCandidate[],
  appId: number,
  capsuleFilename?: string,
  storeData?: Record<string, unknown> | null,
) {
  appendStoreArtworkCandidates(candidates, appId, storeData);

  const hash = getCapsuleHash(capsuleFilename);

  appendAssetVariants(candidates, "Library Hero", appId, "library_hero.jpg", {
    hash,
    includeLegacy: false,
  });
  appendAssetVariants(candidates, "Hero", appId, "hero.jpg", {
    hash,
    includeLegacy: false,
  });
  appendAssetVariants(candidates, "Header", appId, "header.jpg", {
    hash,
    includeLegacy: true,
  });
  appendAssetVariants(candidates, "Capsule", appId, "capsule_616x353.jpg", {
    hash,
    includeLegacy: true,
  });
  appendAssetVariants(candidates, "Capsule", appId, "capsule_231x87.jpg", {
    hash,
    includeLegacy: false,
  });
  appendAssetVariants(candidates, "Capsule", appId, "capsule_184x69.jpg", {
    hash,
    includeLegacy: false,
  });
  appendAssetVariants(candidates, "Library Capsule", appId, "library_capsule.jpg", {
    hash,
    includeLegacy: false,
  });
}

function appendCoverPriorityAssets(
  candidates: SteamImageCandidate[],
  appId: number,
  capsuleFilename?: string,
  storeData?: Record<string, unknown> | null,
) {
  appendStoreArtworkCandidates(candidates, appId, storeData);

  const validCapsuleFilename = getValidCapsuleFilename(capsuleFilename);
  const hash = getCapsuleHash(capsuleFilename);

  if (validCapsuleFilename) {
    appendStoreAssetVariants(
      candidates,
      "Library Capsule",
      appId,
      validCapsuleFilename,
    );
  }

  appendAssetVariants(
    candidates,
    "Library Capsule",
    appId,
    "library_600x900.jpg",
    { hash },
  );
  appendAssetVariants(
    candidates,
    "Library Capsule",
    appId,
    "library_capsule.jpg",
    { hash },
  );
  appendAssetVariants(candidates, "Capsule", appId, "capsule_616x353.jpg", {
    hash,
    includeLegacy: true,
  });
  appendAssetVariants(candidates, "Capsule", appId, "capsule_231x87.jpg", {
    hash,
    includeLegacy: false,
  });
  appendAssetVariants(candidates, "Capsule", appId, "capsule_184x69.jpg", {
    hash,
    includeLegacy: false,
  });
  appendAssetVariants(candidates, "Header", appId, "header.jpg", {
    hash,
    includeLegacy: true,
  });
  appendAssetVariants(candidates, "Icon", appId, "icon.jpg", {
    hash,
    includeLegacy: true,
  });
  appendAssetVariants(candidates, "Icon", appId, "capsule_sm_120.jpg", {
    hash,
    includeLegacy: true,
  });
}

function appendExplorePriorityAssets(
  candidates: SteamImageCandidate[],
  appId: number,
  capsuleFilename?: string,
  storeData?: Record<string, unknown> | null,
) {
  appendBannerPriorityAssets(candidates, appId, capsuleFilename, storeData);
}

export function extractCapsuleFilenameFromLogoUrl(logoUrl?: string) {
  if (!logoUrl || isLowResolutionSteamImageUrl(logoUrl)) return null;

  const match = logoUrl.match(/\/apps\/\d+\/(.+)$/);
  if (!match) return null;

  const filename = match[1].split("?")[0];
  if (getValidCapsuleFilename(filename)) {
    return filename;
  }

  const hashMatch = filename.match(/^([a-f0-9]{40})\/.+$/);
  return hashMatch ? filename : null;
}

export function extractCapsuleFilenameFromStoreData(
  data: Record<string, unknown>,
) {
  const urls: string[] = [];

  if (typeof data.capsule_imagev5 === "string") {
    urls.push(data.capsule_imagev5);
  }

  if (typeof data.capsule_image === "string") {
    urls.push(data.capsule_image);
  }

  const headerImage =
    typeof data.header_image === "object" &&
    data.header_image !== null &&
    !Array.isArray(data.header_image)
      ? (data.header_image as Record<string, unknown>)
      : null;

  if (headerImage && typeof headerImage.full === "string") {
    urls.push(headerImage.full);
  }

  for (const url of urls) {
    const extracted = extractCapsuleFilenameFromLogoUrl(url);
    if (extracted) {
      return extracted;
    }
  }

  return null;
}

export function resolveCapsuleFilenameForApp(
  options: {
    capsuleFilename?: string;
    imageUrl?: string;
    logoUrl?: string;
    storeData?: Record<string, unknown> | null;
  } = {},
) {
  const ownedCapsule = getValidCapsuleFilename(options.capsuleFilename);
  if (ownedCapsule) {
    return ownedCapsule;
  }

  if (options.storeData) {
    const storeCapsule = extractCapsuleFilenameFromStoreData(options.storeData);
    if (storeCapsule) {
      return storeCapsule;
    }
  }

  const logoCapsule = extractCapsuleFilenameFromLogoUrl(options.logoUrl);
  if (logoCapsule) {
    return logoCapsule;
  }

  return extractCapsuleFilenameFromLogoUrl(options.imageUrl) ?? undefined;
}

function appendLogoDerivedCandidates(
  candidates: SteamImageCandidate[],
  logoUrl?: string,
) {
  if (!logoUrl || isLowResolutionSteamImageUrl(logoUrl)) return;

  const derivedBase = logoUrl.match(
    /^(https:\/\/[^/]+\/store_item_assets\/steam\/apps\/\d+\/[a-f0-9]{40}\/)/,
  );

  if (!derivedBase) return;

  const base = derivedBase[1];
  const derivedAssets: Array<[string, string]> = [
    ["Library Hero", "library_hero.jpg"],
    ["Hero", "hero.jpg"],
    ["Header", "header.jpg"],
    ["Capsule", "capsule_616x353.jpg"],
    ["Library Capsule", "library_capsule.jpg"],
    ["Library Capsule", "library_600x900.jpg"],
  ];

  for (const [label, filename] of derivedAssets) {
    candidates.push({
      label,
      url: `${base}${filename}`,
    });
  }
}

export function getSteamBannerImageCandidates(
  appId: number,
  capsuleFilename?: string,
  storeData?: Record<string, unknown> | null,
) {
  const candidates: SteamImageCandidate[] = [];
  appendBannerPriorityAssets(candidates, appId, capsuleFilename, storeData);
  appendDefaultFallback(candidates);

  return dedupeCandidates(candidates);
}

export function getSteamCoverImageCandidates(
  appId: number,
  capsuleFilename?: string,
  storeData?: Record<string, unknown> | null,
) {
  const candidates: SteamImageCandidate[] = [];
  appendCoverPriorityAssets(candidates, appId, capsuleFilename, storeData);
  appendDefaultFallback(candidates);

  return dedupeCandidates(candidates);
}

export function getSteamExploreCardImageCandidates(
  appId: number,
  capsuleFilename?: string,
  logoUrl?: string,
  storeData?: Record<string, unknown> | null,
) {
  const candidates: SteamImageCandidate[] = [];
  const resolvedCapsule =
    capsuleFilename ?? extractCapsuleFilenameFromLogoUrl(logoUrl) ?? undefined;

  appendExplorePriorityAssets(
    candidates,
    appId,
    resolvedCapsule,
    storeData,
  );
  appendLogoDerivedCandidates(candidates, logoUrl);

  if (logoUrl && !isLowResolutionSteamImageUrl(logoUrl)) {
    candidates.push({
      label: "Store Capsule",
      url: logoUrl,
    });
  }

  appendDefaultFallback(candidates);

  return dedupeCandidates(candidates);
}

export async function buildSteamExploreCardImage(
  appId: number,
  options: {
    capsuleFilename?: string;
    logoUrl?: string;
    gameTitle?: string;
  } = {},
) {
  const resolvedCapsule = resolveCapsuleFilenameForApp({
    capsuleFilename: options.capsuleFilename,
    logoUrl: options.logoUrl,
  });
  const storeApp = await fetchStoreAppData(appId).catch(() => ({
    success: false,
    data: null,
    source: "api" as const,
  }));
  const storeData = storeApp.success ? storeApp.data : null;
  const candidates = getSteamExploreCardImageCandidates(
    appId,
    resolvedCapsule,
    options.logoUrl,
    storeData,
  );
  const { imageUrl, candidates: orderedCandidates } = await buildPrimaryImageResult(
    appId,
    "card",
    candidates,
    {
      preferredUrl: options.logoUrl,
      storeData,
    },
  );

  return {
    imageUrl,
    imageCandidates: orderedCandidates.map((entry) => entry.url),
  };
}

export async function buildSteamBannerImageCandidates(
  appId: number,
  options: {
    capsuleFilename?: string;
    storeData?: Record<string, unknown> | null;
  } = {},
) {
  const resolvedCapsule = resolveCapsuleFilenameForApp({
    capsuleFilename: options.capsuleFilename,
    storeData: options.storeData,
  });

  return reorderCandidatesWithCachedUrl(
    appId,
    "banner",
    getSteamBannerImageCandidates(
      appId,
      resolvedCapsule,
      options.storeData,
    ),
    options.storeData,
  );
}

export async function buildSteamCoverImageCandidates(
  appId: number,
  options: {
    capsuleFilename?: string;
    storeData?: Record<string, unknown> | null;
  } = {},
) {
  const resolvedCapsule = resolveCapsuleFilenameForApp({
    capsuleFilename: options.capsuleFilename,
    storeData: options.storeData,
  });

  return reorderCandidatesWithCachedUrl(
    appId,
    "cover",
    getSteamCoverImageCandidates(appId, resolvedCapsule, options.storeData),
    options.storeData,
  );
}

export function getSteamLibraryImageUrls(
  appId: number,
  capsuleFilename?: string,
  storeData?: Record<string, unknown> | null,
) {
  const resolvedCapsule = resolveCapsuleFilenameForApp({
    capsuleFilename,
    storeData,
  });
  const bannerCandidates = getSteamBannerImageCandidates(
    appId,
    resolvedCapsule,
    storeData,
  );
  const steamCandidates = bannerCandidates.filter(
    (candidate) => candidate.url !== DEFAULT_GAME_FALLBACK_IMAGE,
  );

  return {
    primary: steamCandidates[0]?.url ?? DEFAULT_GAME_FALLBACK_IMAGE,
    fallback:
      steamCandidates[1]?.url ??
      steamCandidates[0]?.url ??
      DEFAULT_GAME_FALLBACK_IMAGE,
  };
}

export async function buildSteamDashboardGameImage(
  appId: number,
  options: {
    capsuleFilename?: string;
    gameTitle?: string;
  } = {},
) {
  const storeApp = await fetchStoreAppData(appId).catch(() => ({
    success: false,
    data: null,
    source: "api" as const,
  }));
  const storeData = storeApp.success ? storeApp.data : null;
  const resolvedCapsule = resolveCapsuleFilenameForApp({
    capsuleFilename: options.capsuleFilename,
    storeData,
  });
  const candidates = getSteamBannerImageCandidates(
    appId,
    resolvedCapsule,
    storeData,
  );
  const { imageUrl, candidates: orderedCandidates } =
    await buildPrimaryImageResult(appId, "card", candidates, {
      storeData,
    });
  const steamCandidates = orderedCandidates
    .map((candidate) => candidate.url)
    .filter((url) => url !== DEFAULT_GAME_FALLBACK_IMAGE);

  return {
    imageUrl: steamCandidates[0] ?? imageUrl,
    imageFallbackUrl: steamCandidates[1],
    imageCandidates: steamCandidates,
  };
}

export async function enrichDashboardGamesWithSteamImages<
  T extends {
    id: string;
    title: string;
    imageUrl: string;
    imageFallbackUrl?: string;
    imageCandidates?: string[];
  },
>(
  games: T[],
  options: {
    capsuleFilenameByAppId?: Map<number, string | undefined>;
  } = {},
): Promise<T[]> {
  return Promise.all(
    games.map(async (game) => {
      const appId = Number(game.id);
      if (!Number.isInteger(appId) || appId <= 0) {
        return game;
      }

      const images = await buildSteamDashboardGameImage(appId, {
        capsuleFilename: options.capsuleFilenameByAppId?.get(appId),
        gameTitle: game.title,
      });

      return {
        ...game,
        imageUrl: images.imageUrl,
        imageFallbackUrl: images.imageFallbackUrl,
        imageCandidates: images.imageCandidates,
      };
    }),
  );
}

export function getDefaultGameImageCandidates() {
  return [
    {
      label: "Default fallback",
      url: DEFAULT_GAME_FALLBACK_IMAGE,
    },
  ];
}

const imageVerificationCache = new Map<
  string,
  { expiresAt: number; available: boolean }
>();
const IMAGE_VERIFICATION_CACHE_TTL_MS = 2 * 60 * 60 * 1000;

export async function verifySteamImageUrl(url: string) {
  if (url.startsWith("/")) return true;

  const cached = imageVerificationCache.get(url);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.available;
  }

  try {
    let response = await fetch(url, {
      method: "HEAD",
      cache: "no-store",
    });

    if (response.status === 405 || response.status === 501) {
      response = await fetch(url, {
        method: "GET",
        cache: "no-store",
        headers: {
          Range: "bytes=0-0",
        },
      });
    }

    const available = response.ok;

    imageVerificationCache.set(url, {
      available,
      expiresAt: Date.now() + IMAGE_VERIFICATION_CACHE_TTL_MS,
    });

    return available;
  } catch {
    imageVerificationCache.set(url, {
      available: false,
      expiresAt: Date.now() + IMAGE_VERIFICATION_CACHE_TTL_MS,
    });
    return false;
  }
}
