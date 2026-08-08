import { NextResponse } from "next/server";
import { resolveGameDisplayBatch } from "@/lib/game-display/resolve";
import { parseBoundedAppIds } from "@/lib/security/parse-app-ids";
import { assertPublicApiRateLimit } from "@/lib/security/request";
import { RateLimitError } from "@/lib/security/rate-limit";

export async function GET(request: Request) {
  try {
    assertPublicApiRateLimit(request, "games-metadata");
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
    }

    return NextResponse.json({ error: "REQUEST_FAILED" }, { status: 500 });
  }

  const appIds = parseBoundedAppIds(new URL(request.url).searchParams);

  if (appIds.length === 0) {
    return NextResponse.json({});
  }

  const displays = await resolveGameDisplayBatch(
    appIds.map((appId) => ({ appId })),
    { persist: true },
  );

  return NextResponse.json(
    Object.fromEntries(
      Array.from(displays.entries()).map(([appId, display]) => [
        String(appId),
        display.name,
      ]),
    ),
    {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      },
    },
  );
}
