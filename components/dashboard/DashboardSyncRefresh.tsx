"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { getDashboardLastSyncedAt } from "@/app/[locale]/dashboard/actions";

const POLL_INTERVAL_MS = 2_000;
const MAX_POLL_DURATION_MS = 5 * 60 * 1_000;

type DashboardSyncRefreshProps = {
  initialLastSyncedAt: string | null;
  enabled: boolean;
};

function isLastSyncedAtNewer(
  initialLastSyncedAt: string | null,
  currentLastSyncedAt: string | null,
) {
  if (!currentLastSyncedAt) {
    return false;
  }

  if (!initialLastSyncedAt) {
    return true;
  }

  return (
    new Date(currentLastSyncedAt).getTime() >
    new Date(initialLastSyncedAt).getTime()
  );
}

export function DashboardSyncRefresh({
  initialLastSyncedAt,
  enabled,
}: DashboardSyncRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    const startedAt = Date.now();

    async function pollForSyncCompletion() {
      while (!cancelled && Date.now() - startedAt < MAX_POLL_DURATION_MS) {
        await new Promise((resolve) => {
          setTimeout(resolve, POLL_INTERVAL_MS);
        });

        if (cancelled) {
          return;
        }

        try {
          const currentLastSyncedAt = await getDashboardLastSyncedAt();

          if (
            isLastSyncedAtNewer(initialLastSyncedAt, currentLastSyncedAt)
          ) {
            router.refresh();
            return;
          }
        } catch {
          // Keep polling until timeout.
        }
      }
    }

    void pollForSyncCompletion();

    return () => {
      cancelled = true;
    };
  }, [enabled, initialLastSyncedAt, router]);

  return null;
}
