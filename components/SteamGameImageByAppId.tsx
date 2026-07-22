"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  buildSteamGameImageCandidates,
  type SteamGameImageVariant,
} from "@/lib/steam/game-image-candidates-client";
import type { GameImageRole } from "@/lib/steam/game-image-cache";
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
  const [serverCandidates, setServerCandidates] = useState<string[]>([]);
  const [candidateIndex, setCandidateIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchResolvedCandidates() {
      try {
        const response = await fetch(
          `/api/games/images?appIds=${appId}&variant=${variant}`,
          { cache: "no-store" },
        );

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as Record<string, string[]>;
        const resolvedCandidates = payload[String(appId)];

        if (!cancelled && Array.isArray(resolvedCandidates) && resolvedCandidates.length > 0) {
          setServerCandidates(resolvedCandidates);
        }
      } catch {
        // Keep local fallback chain until a later retry or navigation refresh.
      }
    }

    void fetchResolvedCandidates();

    return () => {
      cancelled = true;
    };
  }, [appId, variant]);

  const candidates = useMemo(() => {
    if (serverCandidates.length > 0) {
      return serverCandidates;
    }

    if (initialCandidates.length > 0) {
      return initialCandidates;
    }

    return buildSteamGameImageCandidates(appId, {
      variant,
      preferredUrls: [...preferredUrls],
    });
  }, [appId, initialCandidates, preferredUrls, serverCandidates, variant]);

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
