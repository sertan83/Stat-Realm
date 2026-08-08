"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { GAME_LIST_IMAGE_VARIANT } from "@/lib/game-display/constants";
import { buildSteamGameImageCandidates } from "@/lib/steam/game-image-candidates-client";
import {
  isGenericFallbackImage,
  isUsableGameImageUrl,
} from "@/lib/steam/game-image-urls";
import { DEFAULT_GAME_FALLBACK_IMAGE } from "@/lib/steam/image-constants";

type GameListImageProps = {
  appId: number;
  alt: string;
  imageUrl?: string;
  imageCandidates?: string[];
  preferredUrls?: Array<string | null | undefined>;
  capsuleFilename?: string | null;
  sizes: string;
  className?: string;
  priority?: boolean;
};

function mergeCandidateLists(...lists: string[][]) {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const list of lists) {
    for (const url of list) {
      const normalized = url?.trim();
      if (!normalized || seen.has(normalized)) {
        continue;
      }

      seen.add(normalized);
      merged.push(normalized);
    }
  }

  return merged;
}

function buildLocalCandidates(
  appId: number,
  options: {
    imageUrl?: string;
    imageCandidates?: string[];
    preferredUrls?: Array<string | null | undefined>;
    capsuleFilename?: string | null;
  },
) {
  return buildSteamGameImageCandidates(appId, {
    variant: GAME_LIST_IMAGE_VARIANT,
    preferredUrls: [
      options.imageUrl,
      ...(options.preferredUrls ?? []),
      ...(options.imageCandidates ?? []),
    ],
    capsuleFilename: options.capsuleFilename,
    storedImageUrls: options.imageCandidates,
  });
}

export function GameListImage({
  appId,
  alt,
  imageUrl,
  imageCandidates,
  preferredUrls = [],
  capsuleFilename,
  sizes,
  className = "object-cover",
  priority = false,
}: GameListImageProps) {
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [resolvedCandidates, setResolvedCandidates] = useState<string[]>([]);

  useEffect(() => {
    if (!Number.isInteger(appId) || appId <= 0) {
      return;
    }

    let cancelled = false;

    async function fetchResolvedDisplay() {
      try {
        const response = await fetch(
          `/api/games/display?appIds=${appId}&variant=${GAME_LIST_IMAGE_VARIANT}`,
          { cache: "no-store" },
        );

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as Record<
          string,
          {
            imageUrl?: string;
            imageCandidates?: string[];
            capsuleImageCandidates?: string[];
          }
        >;
        const display = payload[String(appId)];

        if (cancelled || !display) {
          return;
        }

        const fetchedCandidates = mergeCandidateLists(
          display.imageUrl ? [display.imageUrl] : [],
          display.capsuleImageCandidates ?? [],
          display.imageCandidates ?? [],
        ).filter(isUsableGameImageUrl);

        if (fetchedCandidates.length > 0) {
          setResolvedCandidates(fetchedCandidates);
        }
      } catch {
        // Keep local Steam candidate chain.
      }
    }

    void fetchResolvedDisplay();

    return () => {
      cancelled = true;
    };
  }, [appId]);

  const candidates = useMemo(() => {
    const localCandidates = buildLocalCandidates(appId, {
      imageUrl,
      imageCandidates,
      preferredUrls,
      capsuleFilename,
    }).filter((candidate) => !isGenericFallbackImage(candidate));

    const merged = mergeCandidateLists(
      resolvedCandidates,
      localCandidates,
    );

    if (merged.length === 0) {
      return [DEFAULT_GAME_FALLBACK_IMAGE];
    }

    if (!merged.includes(DEFAULT_GAME_FALLBACK_IMAGE)) {
      merged.push(DEFAULT_GAME_FALLBACK_IMAGE);
    }

    return merged;
  }, [
    appId,
    capsuleFilename,
    imageCandidates,
    imageUrl,
    preferredUrls,
    resolvedCandidates,
  ]);

  useEffect(() => {
    setCandidateIndex(0);
  }, [candidates]);

  const activeUrl = candidates[candidateIndex] ?? DEFAULT_GAME_FALLBACK_IMAGE;

  return (
    <Image
      key={activeUrl}
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
