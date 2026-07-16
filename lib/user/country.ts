export function countryCodeToFlag(countryCode?: string | null) {
  if (!countryCode || countryCode.length !== 2) {
    return "🌐";
  }

  return String.fromCodePoint(
    ...countryCode
      .toUpperCase()
      .split("")
      .map((character) => character.charCodeAt(0) + 127397),
  );
}

export function getCountryDisplay(countryCode?: string | null) {
  if (!countryCode || countryCode.length !== 2) {
    return "Unknown";
  }

  try {
    const displayName = new Intl.DisplayNames(["en"], {
      type: "region",
    }).of(countryCode.toUpperCase());

    return displayName ?? countryCode.toUpperCase();
  } catch {
    return countryCode.toUpperCase();
  }
}

export function formatLastSyncedAt(timestamp?: string | null) {
  if (!timestamp) {
    return "Unavailable";
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "Unavailable";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
