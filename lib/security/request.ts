import "server-only";

import { assertRateLimit, RateLimitError } from "@/lib/security/rate-limit";

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) {
      return firstIp;
    }
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function assertPublicApiRateLimit(request: Request, scope: string) {
  const clientIp = getClientIp(request);

  try {
    assertRateLimit(`${scope}:${clientIp}`, {
      windowMs: 60_000,
      maxRequests: 120,
      minIntervalMs: 100,
    });
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw error;
    }

    throw new RateLimitError();
  }
}

export function assertImageCacheRateLimit(request: Request) {
  const clientIp = getClientIp(request);

  assertRateLimit(`game-image-cache:${clientIp}`, {
    windowMs: 60_000,
    maxRequests: 60,
    minIntervalMs: 250,
  });
}

export function assertHelpfulVoteRateLimit(voterSteamId: string) {
  assertRateLimit(`helpful-vote:${voterSteamId}`, {
    windowMs: 60 * 60 * 1000,
    maxRequests: 40,
    minIntervalMs: 3_000,
  });
}
