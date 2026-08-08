import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { GAME_LIST_IMAGE_VARIANT } from "@/lib/game-display/constants";
import { resolveGameDisplayBatch } from "@/lib/game-display/resolve";
import type { SteamGameImageVariant } from "@/lib/game-display/types";
import { parseBoundedAppIds } from "@/lib/security/parse-app-ids";
import { assertPublicApiRateLimit } from "@/lib/security/request";
import { RateLimitError } from "@/lib/security/rate-limit";

const VALID_VARIANTS = new Set<SteamGameImageVariant>([
  "capsule",
  "header",
  "card",
]);

function parseVariant(searchParams: URLSearchParams): SteamGameImageVariant {
  const rawValue = searchParams.get("variant");

  if (rawValue && VALID_VARIANTS.has(rawValue as SteamGameImageVariant)) {
    return rawValue as SteamGameImageVariant;
  }

  return GAME_LIST_IMAGE_VARIANT;
}

function parseRefresh(searchParams: URLSearchParams) {
  const rawValue = searchParams.get("refresh");
  return rawValue === "1" || rawValue === "true";
}

export async function GET(request: Request) {
  try {
    assertPublicApiRateLimit(request, "games-display");
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
    }

    return NextResponse.json({ error: "REQUEST_FAILED" }, { status: 500 });
  }

  const searchParams = new URL(request.url).searchParams;
  const appIds = parseBoundedAppIds(searchParams);

  if (appIds.length === 0) {
    return NextResponse.json({});
  }

  const variant = parseVariant(searchParams);
  const requestedRefresh = parseRefresh(searchParams);
  const session = requestedRefresh ? await auth() : null;
  const refresh = requestedRefresh && Boolean(session?.user?.steamId);

  const displays = await resolveGameDisplayBatch(
    appIds.map((appId) => ({ appId })),
    {
      imageVariant: variant,
      persist: true,
      refresh,
      steamId: session?.user?.steamId,
    },
  );

  return NextResponse.json(
    Object.fromEntries(
      [...displays.entries()].map(([appId, display]) => [
        String(appId),
        {
          appId: display.appId,
          name: display.name,
          slug: display.slug,
          imageUrl: display.imageUrl,
          imageCandidates: display.imageCandidates,
          headerImageCandidates: display.headerImageCandidates,
          capsuleImageCandidates: display.capsuleImageCandidates,
        },
      ]),
    ),
    {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      },
    },
  );
}
