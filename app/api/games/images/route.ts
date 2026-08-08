import { NextResponse } from "next/server";
import { resolveGameImageCandidatesBatch } from "@/lib/game-display/resolve";
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

  return "card";
}

export async function GET(request: Request) {
  try {
    assertPublicApiRateLimit(request, "games-images");
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
  const candidates = await resolveGameImageCandidatesBatch(appIds, variant);

  return NextResponse.json(
    Object.fromEntries(
      Array.from(candidates.entries()).map(([appId, urls]) => [String(appId), urls]),
    ),
    {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      },
    },
  );
}
