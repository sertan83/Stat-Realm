import { NextResponse } from "next/server";
import { resolveGameDisplayBatch } from "@/lib/game-display/resolve";
import type { SteamGameImageVariant } from "@/lib/game-display/types";

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
  const displays = await resolveGameDisplayBatch(
    appIds.map((appId) => ({ appId })),
    { imageVariant: variant, persist: true },
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
  );
}
