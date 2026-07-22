"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { GAME_LIST_IMAGE_VARIANT } from "@/lib/game-display/constants";
import { buildSteamGameImageCandidates } from "@/lib/steam/game-image-candidates-client";
import { DEFAULT_GAME_FALLBACK_IMAGE } from "@/lib/steam/image-constants";

type GameListImageProps = {
  appId: number;
  alt: string;
  imageUrl?: string;
  imageCandidates?: string[];
  preferredUrls?: Array<string | null | undefined>;
  sizes: string;
  className?: string;
  priority?: boolean;
};

function buildGameListImageCandidates(
  appId: number,
  options: {
    imageUrl?: string;
    imageCandidates?: string[];
    preferredUrls?: Array<string | null | undefined>;
  },
) {
  const seen = new Set<string>();
  const candidates: string[] = [];

  function add(url: string | null | undefined) {
    const normalized = url?.trim();
    if (!normalized || seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    candidates.push(normalized);
  }

  add(options.imageUrl);

  for (const preferredUrl of options.preferredUrls ?? []) {
    add(preferredUrl);
  }

  for (const candidate of options.imageCandidates ?? []) {
    add(candidate);
  }

  for (const candidate of buildSteamGameImageCandidates(appId, {
    variant: GAME_LIST_IMAGE_VARIANT,
    preferredUrls: [options.imageUrl, ...(options.preferredUrls ?? [])],
  })) {
    add(candidate);
  }

  if (!candidates.includes(DEFAULT_GAME_FALLBACK_IMAGE)) {
    candidates.push(DEFAULT_GAME_FALLBACK_IMAGE);
  }

  return candidates;
}

export function GameListImage({
  appId,
  alt,
  imageUrl,
  imageCandidates,
  preferredUrls = [],
  sizes,
  className = "object-cover",
  priority = false,
}: GameListImageProps) {
  const [candidateIndex, setCandidateIndex] = useState(0);

  const candidates = useMemo(
    () =>
      buildGameListImageCandidates(appId, {
        imageUrl,
        imageCandidates,
        preferredUrls,
      }),
    [appId, imageCandidates, imageUrl, preferredUrls],
  );

  const activeUrl = candidates[candidateIndex] ?? DEFAULT_GAME_FALLBACK_IMAGE;

  return (
    <Image
      src={activeUrl}
      alt={alt}
      fill
      priority={priority}
      unoptimized
      sizes={sizes}
      className={className}
      onError={() => {
        if (candidateIndex + 1 < candidates.length) {
          setCandidateIndex((currentIndex) => currentIndex + 1);
        }
      }}
    />
  );
}
