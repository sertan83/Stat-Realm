import "server-only";

import { getUserLibrary } from "@/lib/db";

export async function userOwnsGameInLibrary(
  steamId: string,
  appId: number,
): Promise<boolean> {
  const library = await getUserLibrary(steamId);
  return library.some((game) => game.appId === appId);
}
