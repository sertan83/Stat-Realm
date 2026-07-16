import type { GameImageRole } from "@/lib/steam/game-image-cache";
import { isCacheableSteamImageUrl } from "@/lib/steam/image-url-utils";

export function reportSuccessfulGameImage(
  appId: number,
  role: GameImageRole,
  url: string,
) {
  if (!Number.isInteger(appId) || appId <= 0 || !isCacheableSteamImageUrl(url)) {
    return;
  }

  void fetch("/api/game-images/cache", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      appId,
      role,
      url,
    }),
    keepalive: true,
  }).catch(() => undefined);
}
