import { isLowResolutionSteamImageUrl } from "@/lib/steam/image-url-utils";
import type { SteamImageCandidate } from "@/types/steam-images";

export type StoreArtworkContext = {
  artworkUrls: string[];
  headerHash: string | null;
  capsuleHash: string | null;
  contentHashes: string[];
};

const STORE_ASSET_PATH_PATTERN =
  /\/store_item_assets\/steam\/apps\/(\d+)\/([a-f0-9]{40})\/([^/?]+)/i;

function isStoreHeaderAssetFilename(filename: string) {
  return /^header(?:_alt_assets_\d+)?\.jpg$/i.test(filename);
}

function isStoreHeaderAssetUrl(url: string) {
  const parsed = parseStoreAssetPath(url);
  return parsed ? isStoreHeaderAssetFilename(parsed.filename) : false;
}

export function normalizeSteamArtworkUrl(url: string) {
  try {
    const parsed = new URL(url);
    parsed.search = "";
    return parsed.toString();
  } catch {
    return url.split("?")[0];
  }
}

export function parseStoreAssetPath(url: string) {
  const match = url.match(STORE_ASSET_PATH_PATTERN);
  if (!match) return null;

  const appId = Number(match[1]);
  const hash = match[2];
  const filename = match[3];

  if (!Number.isInteger(appId) || appId <= 0 || !hash || !filename) {
    return null;
  }

  return { appId, hash, filename };
}

function pushUniqueUrl(urls: string[], url?: string | null) {
  if (!url || isLowResolutionSteamImageUrl(url)) {
    return;
  }

  const normalized = normalizeSteamArtworkUrl(url);
  if (!urls.includes(normalized)) {
    urls.push(normalized);
  }
}

export function extractStoreArtworkUrls(
  data: Record<string, unknown>,
): string[] {
  const urls: string[] = [];

  if (typeof data.capsule_imagev5 === "string") {
    pushUniqueUrl(urls, data.capsule_imagev5);
  }

  if (typeof data.capsule_image === "string") {
    pushUniqueUrl(urls, data.capsule_image);
  }

  const headerImage =
    typeof data.header_image === "object" &&
    data.header_image !== null &&
    !Array.isArray(data.header_image)
      ? (data.header_image as Record<string, unknown>)
      : null;

  if (headerImage && typeof headerImage.full === "string") {
    pushUniqueUrl(urls, headerImage.full);
  } else if (typeof data.header_image === "string") {
    pushUniqueUrl(urls, data.header_image);
  }

  if (typeof data.background_raw === "string") {
    pushUniqueUrl(urls, data.background_raw);
  }

  if (typeof data.background === "string") {
    pushUniqueUrl(urls, data.background);
  }

  return urls;
}

export function getStoreArtworkContext(
  data: Record<string, unknown> | null | undefined,
): StoreArtworkContext | null {
  if (!data) {
    return null;
  }

  const artworkUrls = extractStoreArtworkUrls(data);
  const contentHashes = new Set<string>();
  let headerHash: string | null = null;
  let capsuleHash: string | null = null;

  for (const url of artworkUrls) {
    const parsed = parseStoreAssetPath(url);
    if (!parsed) continue;

    contentHashes.add(parsed.hash);

    if (isStoreHeaderAssetFilename(parsed.filename)) {
      headerHash = parsed.hash;
    }

    if (parsed.filename.startsWith("capsule_")) {
      capsuleHash ??= parsed.hash;
    }
  }

  return {
    artworkUrls,
    headerHash,
    capsuleHash,
    contentHashes: Array.from(contentHashes),
  };
}

const HASH_ASSET_VARIANTS = [
  ["Store Header", "header.jpg"],
  ["Store Library Hero", "library_hero.jpg"],
  ["Store Hero", "hero.jpg"],
  ["Store Capsule", "capsule_616x353.jpg"],
  ["Store Capsule Wide", "capsule_231x87.jpg"],
  ["Store Capsule Compact", "capsule_184x69.jpg"],
  ["Store Library Capsule", "library_capsule.jpg"],
  ["Store Library Cover", "library_600x900.jpg"],
] as const;

function appendHashDerivedCandidates(
  candidates: SteamImageCandidate[],
  appId: number,
  hash: string,
  priorityFilenames?: string[],
) {
  const filenames = priorityFilenames
    ? [
        ...priorityFilenames,
        ...HASH_ASSET_VARIANTS.map(([, filename]) => filename).filter(
          (filename) => !priorityFilenames.includes(filename),
        ),
      ]
    : HASH_ASSET_VARIANTS.map(([, filename]) => filename);

  for (const filename of filenames) {
    const label =
      HASH_ASSET_VARIANTS.find(([, candidate]) => candidate === filename)?.[0] ??
      "Store Asset";

    for (const host of [
      "https://shared.fastly.steamstatic.com",
      "https://shared.akamai.steamstatic.com",
    ] as const) {
      candidates.push({
        label,
        url: `${host}/store_item_assets/steam/apps/${appId}/${hash}/${filename}`,
      });
    }
  }
}

export function appendStoreArtworkCandidates(
  candidates: SteamImageCandidate[],
  appId: number,
  storeData?: Record<string, unknown> | null,
) {
  const context = getStoreArtworkContext(storeData);
  if (!context) {
    return;
  }

  for (const url of context.artworkUrls) {
    candidates.push({
      label: "Official Store Artwork",
      url,
    });
  }

  if (context.headerHash) {
    appendHashDerivedCandidates(candidates, appId, context.headerHash, [
      "header.jpg",
      "library_hero.jpg",
      "hero.jpg",
      "capsule_616x353.jpg",
      "capsule_231x87.jpg",
    ]);
  }

  for (const hash of context.contentHashes) {
    if (hash === context.headerHash) continue;

    appendHashDerivedCandidates(candidates, appId, hash, [
      "capsule_616x353.jpg",
      "capsule_231x87.jpg",
      "capsule_184x69.jpg",
      "library_capsule.jpg",
      "library_600x900.jpg",
    ]);
  }
}

export function pickPrimaryStoreArtworkUrl(
  storeData: Record<string, unknown> | null | undefined,
  role: "banner" | "cover" | "card",
) {
  const context = getStoreArtworkContext(storeData);
  if (!context || context.artworkUrls.length === 0) {
    return null;
  }

  const { artworkUrls } = context;

  if (role === "cover") {
    return (
      artworkUrls.find((url) => /capsule_184x69|library_600x900|library_capsule/i.test(url)) ??
      artworkUrls.find((url) => url.includes("capsule_")) ??
      artworkUrls.find((url) => url.includes("header.jpg")) ??
      artworkUrls[0]
    );
  }

  if (role === "card") {
    return (
      artworkUrls.find((url) => isStoreHeaderAssetUrl(url)) ??
      artworkUrls.find((url) => /capsule_616x353|capsule_231x87/i.test(url)) ??
      artworkUrls.find((url) => url.includes("capsule_")) ??
      artworkUrls[0]
    );
  }

  return (
    artworkUrls.find(
      (url) =>
        isStoreHeaderAssetUrl(url) ||
        /library_hero|hero\.jpg/i.test(url),
    ) ??
    artworkUrls.find((url) => url.includes("background")) ??
    artworkUrls.find((url) => url.includes("capsule_")) ??
    artworkUrls[0]
  );
}
