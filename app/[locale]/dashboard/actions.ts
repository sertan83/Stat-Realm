"use server";

import { auth } from "@/auth";
import { getStatRealmUser } from "@/lib/db";

export async function getDashboardLastSyncedAt(): Promise<string | null> {
  const session = await auth();
  const steamId = session?.user?.steamId;

  if (!steamId) {
    return null;
  }

  const user = await getStatRealmUser(steamId);
  return user?.lastSyncedAt ?? null;
}
