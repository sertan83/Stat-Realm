import { NextResponse } from "next/server";
import type { SteamGameImageVariant } from "@/lib/steam/game-image-candidates-client";
import { resolveGameImageCandidatesBatch } from "@/lib/steam/resolve-game-images";

const VALID_VARIANTS = new Set<SteamGameImageVariant>([
  "capsule",
  "header",
  "card",
]);

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

function parseVariant(searchParams: URLSearchParams): SteamGameImageVariant {
  const rawValue = searchParams.get("variant");

  if (rawValue && VALID_VARIANTS.has(rawValue as SteamGameImageVariant)) {
    return rawValue as SteamGameImageVariant;
  }

  return "card";
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const appIds = parseAppIds(searchParams);

  if (appIds.length === 0) {
    return NextResponse.json({});
  }

  const variant = parseVariant(searchParams);
  const candidates = await resolveGameImageCandidatesBatch(appIds, variant);

  return NextResponse.json(
    Object.fromEntries(
      Array.from(candidates.entries()).map(([appId, urls]) => [String(appId), urls]),
    ),
  );
}
