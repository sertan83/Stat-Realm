"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GAME_LIST_IMAGE_VARIANT } from "@/lib/game-display/constants";
import { buildSteamGameImageCandidates } from "@/lib/steam/game-image-candidates-client";
import {
  isGenericFallbackImage,
  isLegacySteamCdnGuessUrl,
  isTrustedStoredGameImageUrl,
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
    storedImageUrls: options.imageCandidates?.filter(isTrustedStoredGameImageUrl),
  });
}

function shouldForceImageRefresh(
  imageUrl?: string,
  imageCandidates?: string[],
  capsuleFilename?: string | null,
) {
  if (capsuleFilename?.trim()) {
    return false;
  }

  if (isTrustedStoredGameImageUrl(imageUrl)) {
    return false;
  }

  if (imageCandidates?.some(isTrustedStoredGameImageUrl)) {
    return false;
  }

  return (
    !imageUrl?.trim() ||
    isLegacySteamCdnGuessUrl(imageUrl) ||
    imageCandidates?.every(
      (candidate) =>
        isLegacySteamCdnGuessUrl(candidate) || isGenericFallbackImage(candidate),
    ) === true
  );
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
  const [refreshAttempt, setRefreshAttempt] = useState(0);

  const needsInitialRefresh = useMemo(
    () =>
      shouldForceImageRefresh(imageUrl, imageCandidates, capsuleFilename),
    [capsuleFilename, imageCandidates, imageUrl],
  );

  const fetchResolvedDisplay = useCallback(
    async (forceRefresh: boolean, cancelled: () => boolean) => {
      if (!Number.isInteger(appId) || appId <= 0) {
        return;
      }

      try {
        const refreshQuery =
          forceRefresh || needsInitialRefresh ? "&refresh=1" : "";
        const response = await fetch(
          `/api/games/display?appIds=${appId}&variant=${GAME_LIST_IMAGE_VARIANT}${refreshQuery}`,
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

        if (cancelled() || !display) {
          return;
        }

        const fetchedCandidates = mergeCandidateLists(
          display.imageUrl ? [display.imageUrl] : [],
          display.capsuleImageCandidates ?? [],
          display.imageCandidates ?? [],
        ).filter(isUsableGameImageUrl);

        if (fetchedCandidates.length > 0) {
          setResolvedCandidates(fetchedCandidates);
          setCandidateIndex(0);
        }
      } catch {
        // Keep local Steam candidate chain.
      }
    },
    [appId, needsInitialRefresh],
  );

  useEffect(() => {
    let cancelled = false;

    void fetchResolvedDisplay(false, () => cancelled);

    return () => {
      cancelled = true;
    };
  }, [fetchResolvedDisplay]);

  useEffect(() => {
    if (refreshAttempt === 0) {
      return;
    }

    let cancelled = false;

    void fetchResolvedDisplay(true, () => cancelled);

    return () => {
      cancelled = true;
    };
  }, [fetchResolvedDisplay, refreshAttempt]);

  const candidates = useMemo(() => {
    const localCandidates = buildLocalCandidates(appId, {
      imageUrl,
      imageCandidates,
      preferredUrls,
      capsuleFilename,
    }).filter((candidate) => !isGenericFallbackImage(candidate));

    const merged = mergeCandidateLists(
      resolvedCandidates.filter(isTrustedStoredGameImageUrl),
      resolvedCandidates.filter(
        (candidate) =>
          isUsableGameImageUrl(candidate) &&
          !isTrustedStoredGameImageUrl(candidate),
      ),
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
          return;
        }

        if (refreshAttempt === 0) {
          setRefreshAttempt(1);
        }
      }}
    />
  );
}
