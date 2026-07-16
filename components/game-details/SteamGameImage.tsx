"use client";

import Image from "next/image";
import { useState } from "react";
import type { GameImageRole } from "@/lib/steam/game-image-cache";
import { DEFAULT_GAME_FALLBACK_IMAGE } from "@/lib/steam/image-constants";
import { reportSuccessfulGameImage } from "@/lib/steam/report-game-image-cache";
import type { SteamImageCandidate } from "@/types/steam-images";

type SteamGameImageProps = {
  gameTitle: string;
  imageRole: "Banner" | "Cover";
  candidates: SteamImageCandidate[];
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
  wrapperClassName?: string;
  appId?: number | null;
  imageCacheRole?: GameImageRole;
};

export function SteamGameImage({
  gameTitle,
  imageRole,
  candidates,
  alt,
  sizes,
  className = "object-cover",
  priority = false,
  wrapperClassName,
  appId,
  imageCacheRole,
}: SteamGameImageProps) {
  const [candidateIndex, setCandidateIndex] = useState(0);
  const resolvedCandidates =
    candidates.length > 0
      ? candidates.some(
          (candidate) => candidate.url === DEFAULT_GAME_FALLBACK_IMAGE,
        )
        ? candidates
        : [
            ...candidates,
            {
              label: "Default fallback",
              url: DEFAULT_GAME_FALLBACK_IMAGE,
            },
          ]
      : [
          {
            label: "Default fallback",
            url: DEFAULT_GAME_FALLBACK_IMAGE,
          },
        ];
  const activeCandidate =
    resolvedCandidates[candidateIndex] ?? resolvedCandidates[0];
  const activeUrl = activeCandidate.url;

  return (
    <Image
      key={activeUrl}
      src={activeUrl}
      alt={alt}
      fill
      priority={priority}
      sizes={sizes}
      className={className}
      onLoad={() => {
        if (
          appId &&
          imageCacheRole &&
          activeUrl !== DEFAULT_GAME_FALLBACK_IMAGE
        ) {
          reportSuccessfulGameImage(appId, imageCacheRole, activeUrl);
        }

        console.info(
          [
            "[Steam Game Images]",
            gameTitle,
            `${imageRole}: ${activeCandidate.label}${
              candidateIndex > 0 ? " (fallback)" : ""
            }`,
          ].join("\n"),
        );
      }}
      onError={() => {
        if (candidateIndex + 1 < resolvedCandidates.length) {
          setCandidateIndex((currentIndex) => currentIndex + 1);
          return;
        }

        console.warn("[Steam Game Images] All candidates failed", {
          gameTitle,
          imageRole,
          candidates: resolvedCandidates.map((candidate) => candidate.url),
        });
      }}
    />
  );
}
