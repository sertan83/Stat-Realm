import { NextResponse } from "next/server";
import {
  assertImageCacheRateLimit,
  assertPublicApiRateLimit,
  getClientIp,
} from "@/lib/security/request";
import { RateLimitError } from "@/lib/security/rate-limit";
import {
  cacheSuccessfulGameImage,
  type GameImageRole,
} from "@/lib/steam/game-image-cache";
import { isCacheableSteamImageUrl } from "@/lib/steam/image-url-utils";

const VALID_ROLES = new Set<GameImageRole>(["banner", "cover", "card"]);

export async function POST(request: Request) {
  try {
    assertImageCacheRateLimit(request);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ ok: false }, { status: 429 });
    }

    return NextResponse.json({ ok: false }, { status: 500 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { appId, role, url } = body as {
    appId?: unknown;
    role?: unknown;
    url?: unknown;
  };

  if (
    typeof appId !== "number" ||
    !Number.isInteger(appId) ||
    appId <= 0 ||
    appId > 2_147_483_647 ||
    typeof role !== "string" ||
    !VALID_ROLES.has(role as GameImageRole) ||
    typeof url !== "string" ||
    url.length > 2048 ||
    !isCacheableSteamImageUrl(url)
  ) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  await cacheSuccessfulGameImage(appId, role as GameImageRole, url);

  return NextResponse.json(
    { ok: true },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
