import "server-only";

import { getGameDetails } from "@/data/game-details";
import { getSteamAppIdFromImage } from "@/lib/steam/api";
import {
  findSteamAppBySlug,
  getSteamAppList,
} from "@/lib/steam/app-list";

export async function resolveSlugToAppId(slug: string): Promise<number | null> {
  const normalizedSlug = slug.trim().toLocaleLowerCase();
  if (!normalizedSlug) {
    return null;
  }

  const staticDetails = getGameDetails(normalizedSlug);
  if (staticDetails) {
    return getSteamAppIdFromImage(staticDetails.game.imageUrl);
  }

  let match = await findSteamAppBySlug(normalizedSlug);
  if (match) {
    return match.appid;
  }

  await getSteamAppList().catch(() => []);
  match = await findSteamAppBySlug(normalizedSlug);

  return match?.appid ?? null;
}
