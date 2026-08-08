"use server";

import { auth } from "@/auth";
import { getStatRealmUser, getUserProfileAnalytics } from "@/lib/db";

function getLatestIsoTimestamp(
  timestamps: Array<string | null | undefined>,
) {
  let latest: string | null = null;
  let latestMs = -1;

  for (const timestamp of timestamps) {
    if (!timestamp) {
      continue;
    }

    const parsed = new Date(timestamp).getTime();
    if (Number.isFinite(parsed) && parsed > latestMs) {
      latestMs = parsed;
      latest = timestamp;
    }
  }

  return latest;
}

export async function getDashboardLastSyncedAt(): Promise<string | null> {
  const session = await auth();
  const steamId = session?.user?.steamId;

  if (!steamId) {
    return null;
  }

  const [user, profileAnalytics] = await Promise.all([
    getStatRealmUser(steamId),
    getUserProfileAnalytics(steamId),
  ]);

  return getLatestIsoTimestamp([
    user?.lastSyncedAt,
    profileAnalytics?.syncedAt,
  ]);
}
