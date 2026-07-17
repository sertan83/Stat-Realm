type CommonTranslator = (
  key: string,
  values?: Record<string, string | number>,
) => string;

type DashboardTranslator = (
  key: string,
  values?: Record<string, string | number>,
) => string;

export function formatPlaytimeMinutes(minutes: number) {
  const hours = minutes / 60;
  return hours >= 100
    ? `${Math.round(hours).toLocaleString()}h`
    : `${hours.toFixed(1)}h`;
}

export function formatPlaytimeHoursLong(minutes: number) {
  const hours = minutes / 60;
  return hours >= 100
    ? `${Math.round(hours).toLocaleString()} hours`
    : `${hours.toFixed(1)} hours`;
}

export function createIntlFormatters(
  tCommon: CommonTranslator,
  tDashboard: DashboardTranslator,
) {
  return {
    formatPlaytime: formatPlaytimeMinutes,
    formatLastPlayed: (timestamp?: number) => {
      if (!timestamp) {
        return tDashboard("lastPlayed.recently");
      }

      const elapsedDays = Math.floor(
        (Date.now() - timestamp * 1000) / (24 * 60 * 60 * 1000),
      );

      if (elapsedDays <= 0) return tDashboard("lastPlayed.today");
      if (elapsedDays === 1) return tDashboard("lastPlayed.yesterday");
      if (elapsedDays < 7) {
        return tDashboard("lastPlayed.daysAgo", { count: elapsedDays });
      }
      if (elapsedDays < 14) return tDashboard("lastPlayed.oneWeekAgo");
      return tDashboard("lastPlayed.weeksAgo", {
        count: Math.floor(elapsedDays / 7),
      });
    },
    unavailable: () => tCommon("unavailable"),
  };
}

export type IntlFormatters = ReturnType<typeof createIntlFormatters>;
