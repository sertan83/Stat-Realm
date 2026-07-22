import { NextResponse } from "next/server";
import { resolveGameDisplayBatch } from "@/lib/game-display/resolve";

function parseAppIds(searchParams: URLSearchParams) {
  const rawValue = searchParams.get("appIds");

  if (!rawValue) {
    return [];
  }

  return rawValue
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((appId) => Number.isInteger(appId) && appId > 0);
}

export async function GET(request: Request) {
  const appIds = parseAppIds(new URL(request.url).searchParams);

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
  );
}
