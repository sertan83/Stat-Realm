import "server-only";

type RateLimitEntry = {
  windowStartMs: number;
  count: number;
  lastRequestMs: number;
};

const rateLimitBuckets = new Map<string, RateLimitEntry>();

export class RateLimitError extends Error {
  constructor(message = "RATE_LIMITED") {
    super(message);
    this.name = "RateLimitError";
  }
}

export function assertRateLimit(
  key: string,
  options: {
    windowMs: number;
    maxRequests: number;
    minIntervalMs?: number;
  },
) {
  const now = Date.now();
  const entry = rateLimitBuckets.get(key);

  if (!entry || now - entry.windowStartMs >= options.windowMs) {
    rateLimitBuckets.set(key, {
      windowStartMs: now,
      count: 1,
      lastRequestMs: now,
    });
    return;
  }

  if (
    options.minIntervalMs &&
    now - entry.lastRequestMs < options.minIntervalMs
  ) {
    throw new RateLimitError("RATE_LIMIT_INTERVAL");
  }

  if (entry.count >= options.maxRequests) {
    throw new RateLimitError("RATE_LIMIT_HOURLY");
  }

  entry.count += 1;
  entry.lastRequestMs = now;
}
