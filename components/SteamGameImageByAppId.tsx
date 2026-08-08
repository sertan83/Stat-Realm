"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { SteamGameImageVariant } from "@/lib/game-display/types";
import { GAME_LIST_IMAGE_VARIANT } from "@/lib/game-display/constants";
import type { GameImageRole } from "@/lib/steam/game-image-cache";
import { buildSteamGameImageCandidates } from "@/lib/steam/game-image-candidates-client";
import {
  isGenericFallbackImage,
  isUsableGameImageUrl,
} from "@/lib/steam/game-image-urls";
import { DEFAULT_GAME_FALLBACK_IMAGE } from "@/lib/steam/image-constants";
import { reportSuccessfulGameImage } from "@/lib/steam/report-game-image-cache";
import { cn } from "@/lib/utils";

type SteamGameImageByAppIdProps = {
  appId: number;
  alt?: string;
  className?: string;
  sizes: string;
  variant?: SteamGameImageVariant;
  initialCandidates?: string[];
  preferredUrls?: Array<string | null | undefined>;
  capsuleFilename?: string | null;
  unoptimized?: boolean;
  priority?: boolean;
  imageCacheRole?: GameImageRole;
  wrapperClassName?: string;
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

function selectVariantCandidates(
  payload: {
    imageCandidates: string[];
    headerImageCandidates: string[];
    capsuleImageCandidates: string[];
  },
  variant: SteamGameImageVariant,
) {
  if (variant === "header") {
    return payload.headerImageCandidates;
  }

  if (variant === "capsule") {
    return payload.capsuleImageCandidates;
  }

  return payload.imageCandidates;
}

export function SteamGameImageByAppId({
  appId,
  alt = "",
  className = "object-cover",
  sizes,
  variant = GAME_LIST_IMAGE_VARIANT,
  initialCandidates = [],
  preferredUrls = [],
  capsuleFilename,
  unoptimized = false,
  priority = false,
  imageCacheRole,
  wrapperClassName,
}: SteamGameImageByAppIdProps) {
  const [resolvedCandidates, setResolvedCandidates] = useState<string[]>([]);
  const [candidateIndex, setCandidateIndex] = useState(0);

  useEffect(() => {
    if (!Number.isInteger(appId) || appId <= 0) {
      return;
    }

    let cancelled = false;

    async function fetchResolvedDisplay() {
      try {
        const response = await fetch(
          `/api/games/display?appIds=${appId}&variant=${variant}`,
          { cache: "no-store" },
        );

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as Record<
          string,
          {
            imageUrl?: string;
            imageCandidates: string[];
            headerImageCandidates: string[];
            capsuleImageCandidates: string[];
          }
        >;
        const display = payload[String(appId)];

        if (cancelled || !display) {
          return;
        }

        const fetchedCandidates = mergeCandidateLists(
          display.imageUrl ? [display.imageUrl] : [],
          selectVariantCandidates(display, variant),
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
  }, [appId, variant]);

  const candidates = useMemo(() => {
    const localCandidates = buildSteamGameImageCandidates(appId, {
      variant,
      preferredUrls,
      capsuleFilename,
      storedImageUrls: initialCandidates,
    }).filter((candidate) => !isGenericFallbackImage(candidate));

    const merged = mergeCandidateLists(
      resolvedCandidates,
      initialCandidates.filter(isUsableGameImageUrl),
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
    initialCandidates,
    preferredUrls,
    resolvedCandidates,
    variant,
  ]);

  useEffect(() => {
    setCandidateIndex(0);
  }, [candidates]);

  const activeUrl = candidates[candidateIndex] ?? DEFAULT_GAME_FALLBACK_IMAGE;

  const image = (
    <Image
      key={activeUrl}
      src={activeUrl}
      alt={alt}
      fill
      sizes={sizes}
      unoptimized={unoptimized}
      priority={priority}
      className={className}
      onLoad={() => {
        if (
          imageCacheRole &&
          Number.isInteger(appId) &&
          appId > 0 &&
          activeUrl !== DEFAULT_GAME_FALLBACK_IMAGE
        ) {
          reportSuccessfulGameImage(appId, imageCacheRole, activeUrl);
        }
      }}
      onError={() => {
        if (candidateIndex + 1 < candidates.length) {
          setCandidateIndex((currentIndex) => currentIndex + 1);
        }
      }}
    />
  );

  if (!wrapperClassName) {
    return image;
  }

  return <div className={cn("relative", wrapperClassName)}>{image}</div>;
}
