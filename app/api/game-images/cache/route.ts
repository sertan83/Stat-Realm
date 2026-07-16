import { NextResponse } from "next/server";
import {
  cacheSuccessfulGameImage,
  type GameImageRole,
} from "@/lib/steam/game-image-cache";
import { isCacheableSteamImageUrl } from "@/lib/steam/image-url-utils";

const VALID_ROLES = new Set<GameImageRole>(["banner", "cover", "card"]);

export async function POST(request: Request) {
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
    typeof role !== "string" ||
    !VALID_ROLES.has(role as GameImageRole) ||
    typeof url !== "string" ||
    !isCacheableSteamImageUrl(url)
  ) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  await cacheSuccessfulGameImage(appId, role as GameImageRole, url);

  return NextResponse.json({ ok: true });
}
