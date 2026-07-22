"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
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
  preferredUrls = [],
  unoptimized = false,
  priority = false,
  imageCacheRole,
  wrapperClassName,
}: SteamGameImageByAppIdProps) {
  const candidates = useMemo(
    () =>
      buildSteamGameImageCandidates(appId, {
        variant,
        preferredUrls,
      }),
    [appId, preferredUrls, variant],
  );
  const [candidateIndex, setCandidateIndex] = useState(0);
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
