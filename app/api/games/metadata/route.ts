import { NextResponse } from "next/server";
import { resolveGameMetadataBatch } from "@/lib/steam/game-metadata";

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

  const names = await resolveGameMetadataBatch(appIds);

  return NextResponse.json(
    Object.fromEntries(Array.from(names.entries()).map(([appId, name]) => [String(appId), name])),
  );
}
