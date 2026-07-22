"use client";

import { useEffect, useState } from "react";
import {
  GAME_NAME_LOADING_LABEL,
  isPlaceholderGameName,
} from "@/lib/game-metadata/constants";

type GameNameProps = {
  appId: number;
  name: string;
  className?: string;
};

export function GameName({ appId, name, className }: GameNameProps) {
  const [resolvedName, setResolvedName] = useState(() =>
    isPlaceholderGameName(name, appId) ? GAME_NAME_LOADING_LABEL : name,
  );

  useEffect(() => {
    if (!isPlaceholderGameName(name, appId)) {
      setResolvedName(name);
      return;
    }

    let cancelled = false;

    async function fetchMetadata() {
      try {
        const response = await fetch(`/api/games/metadata?appIds=${appId}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as Record<string, string>;
        const nextName = payload[String(appId)];

        if (!cancelled && nextName && !isPlaceholderGameName(nextName, appId)) {
          setResolvedName(nextName);
        }
      } catch {
        // Keep loading label until a later retry or navigation refresh.
      }
    }

    void fetchMetadata();

    return () => {
      cancelled = true;
    };
  }, [appId, name]);

  return <span className={className}>{resolvedName}</span>;
}
