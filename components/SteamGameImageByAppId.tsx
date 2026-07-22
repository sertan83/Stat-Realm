"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { SteamGameImageVariant } from "@/lib/game-display/types";
import type { GameImageRole } from "@/lib/steam/game-image-cache";
import { buildSteamGameImageCandidates } from "@/lib/steam/game-image-candidates-client";
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
  unoptimized?: boolean;
  priority?: boolean;
  imageCacheRole?: GameImageRole;
  wrapperClassName?: string;
};

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
  variant = "card",
  initialCandidates = [],
  preferredUrls = [],
  unoptimized = false,
  priority = false,
  imageCacheRole,
  wrapperClassName,
}: SteamGameImageByAppIdProps) {
  const [resolvedCandidates, setResolvedCandidates] = useState<string[]>([]);
  const [candidateIndex, setCandidateIndex] = useState(0);

  useEffect(() => {
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
            imageCandidates: string[];
            headerImageCandidates: string[];
            capsuleImageCandidates: string[];
          }
        >;
        const display = payload[String(appId)];

        if (!cancelled && display) {
          setResolvedCandidates(selectVariantCandidates(display, variant));
        }
      } catch {
        // Keep local fallback chain until a later retry or navigation refresh.
      }
    }

    void fetchResolvedDisplay();

    return () => {
      cancelled = true;
    };
  }, [appId, variant]);

  const candidates = useMemo(() => {
    if (resolvedCandidates.length > 0) {
      return resolvedCandidates;
    }

    if (initialCandidates.length > 0) {
      return initialCandidates;
    }

    return buildSteamGameImageCandidates(appId, {
      variant,
      preferredUrls,
    });
  }, [appId, initialCandidates, preferredUrls, resolvedCandidates, variant]);

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
