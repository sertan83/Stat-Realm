import "server-only";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const EXCLUDED_NAME_PATTERNS = [
  /\bdemo\b/i,
  /\bplaytest\b/i,
  /\bplay test\b/i,
  /\bsoundtrack\b/i,
  /\boriginal soundtrack\b/i,
  /\bost\b/i,
  /\bdedicated server\b/i,
  /\bserver dedicated\b/i,
  /\bsoftware development kit\b/i,
  /\bsdk\b/i,
  /\btoolkit\b/i,
  /\bmod tools\b/i,
  /\blevel editor\b/i,
  /\binternal test\b/i,
  /\btest app\b/i,
  /\bclosed beta\b/i,
  /\bopen beta\b/i,
  /\bwallpaper\b/i,
  /\bartbook\b/i,
  /\bavatar\b/i,
  /\bemoticon\b/i,
  /\btrading cards?\b/i,
  /\bwiki\b/i,
  / - beta$/i,
  / beta$/i,
  /\bdlc\b/i,
  /\bdownloadable content\b/i,
];

const EXCLUDED_CATEGORY_KEYWORDS = [
  "demo",
  "dlc",
  "mod",
  "video",
  "soundtrack",
  "advertisement",
  "commentary",
  "downloadable content",
];

const EXCLUDED_CATEGORY_IDS = new Set([10]);

export function isExcludedAppName(name: string) {
  const normalized = name.trim();
  if (!normalized) return true;

  return EXCLUDED_NAME_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function isPlayableSteamStoreApp(
  data: Record<string, unknown> | null,
  fallbackName = "",
) {
  if (!data) {
    return false;
  }

  const type = typeof data.type === "string" ? data.type.toLowerCase() : "";
  if (type && type !== "game") {
    return false;
  }

  if (isRecord(data.fullgame)) {
    return false;
  }

  const categories = Array.isArray(data.categories) ? data.categories : [];
  for (const category of categories) {
    if (!isRecord(category)) continue;

    const categoryId = category.id;
    if (
      typeof categoryId === "number" &&
      EXCLUDED_CATEGORY_IDS.has(categoryId)
    ) {
      return false;
    }

    const description =
      typeof category.description === "string"
        ? category.description.toLowerCase()
        : "";

    if (
      EXCLUDED_CATEGORY_KEYWORDS.some((keyword) =>
        description.includes(keyword),
      )
    ) {
      return false;
    }
  }

  const appName =
    typeof data.name === "string" && data.name.trim()
      ? data.name
      : fallbackName;

  if (isExcludedAppName(appName)) {
    return false;
  }

  return true;
}
