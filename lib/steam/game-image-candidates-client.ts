import { DEFAULT_GAME_FALLBACK_IMAGE } from "@/lib/steam/image-constants";

export type SteamGameImageVariant = "capsule" | "header" | "card";

const STORE_ASSET_HOSTS = [
  "https://shared.cloudflare.steamstatic.com",
  "https://shared.fastly.steamstatic.com",
  "https://shared.akamai.steamstatic.com",
] as const;

const LEGACY_STEAM_CDN = "https://cdn.cloudflare.steamstatic.com";

const VARIANT_FILENAMES: Record<SteamGameImageVariant, string[]> = {
  capsule: [
    "capsule_231x87.jpg",
    "capsule_184x69.jpg",
    "capsule_616x353.jpg",
    "library_capsule.jpg",
    "header.jpg",
  ],
  header: [
    "header.jpg",
    "library_hero.jpg",
    "hero.jpg",
    "capsule_616x353.jpg",
    "capsule_231x87.jpg",
  ],
  card: [
    "capsule_231x87.jpg",
    "capsule_184x69.jpg",
    "capsule_616x353.jpg",
    "library_capsule.jpg",
    "header.jpg",
    "library_hero.jpg",
    "hero.jpg",
  ],
};

function appendAssetUrls(urls: string[], appId: number, filename: string) {
  for (const host of STORE_ASSET_HOSTS) {
    urls.push(`${host}/store_item_assets/steam/apps/${appId}/${filename}`);
  }

  urls.push(`${LEGACY_STEAM_CDN}/steam/apps/${appId}/${filename}`);
}

export function buildSteamGameImageCandidates(
  appId: number,
  options?: {
    variant?: SteamGameImageVariant;
    preferredUrls?: Array<string | null | undefined>;
  },
): string[] {
  if (!Number.isInteger(appId) || appId <= 0) {
    return [DEFAULT_GAME_FALLBACK_IMAGE];
  }

  const variant = options?.variant ?? "card";
  const seen = new Set<string>();
  const candidates: string[] = [];

  function add(url: string | null | undefined) {
    const normalized = url?.trim();

    if (!normalized || seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    candidates.push(normalized);
  }

  for (const preferredUrl of options?.preferredUrls ?? []) {
    add(preferredUrl);
  }

  for (const filename of VARIANT_FILENAMES[variant]) {
    const assetUrls: string[] = [];
    appendAssetUrls(assetUrls, appId, filename);

    for (const assetUrl of assetUrls) {
      add(assetUrl);
    }
  }

  add(DEFAULT_GAME_FALLBACK_IMAGE);

  return candidates;
}
