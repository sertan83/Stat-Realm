import "server-only";

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

export function createResponseCache<T>() {
  const cache = new Map<string, CacheEntry<T>>();
  const inFlight = new Map<string, Promise<T>>();

  return {
    get(key: string) {
      const cached = cache.get(key);
      if (!cached || cached.expiresAt <= Date.now()) {
        if (cached) cache.delete(key);
        return undefined;
      }

      return cached.value;
    },
    set(key: string, value: T, ttlMs: number) {
      cache.set(key, {
        value,
        expiresAt: Date.now() + ttlMs,
      });
    },
    async getOrFetch(
      key: string,
      ttlMs: number,
      fetcher: () => Promise<T>,
    ) {
      const cached = this.get(key);
      if (cached !== undefined) {
        return cached;
      }

      const existing = inFlight.get(key);
      if (existing) {
        return existing;
      }

      const promise = fetcher()
        .then((value) => {
          this.set(key, value, ttlMs);
          inFlight.delete(key);
          return value;
        })
        .catch((error) => {
          inFlight.delete(key);
          throw error;
        });

      inFlight.set(key, promise);
      return promise;
    },
  };
}

export async function measureAsync<T>(
  label: string,
  operation: () => Promise<T>,
) {
  const startedAt = performance.now();
  const result = await operation();
  const durationMs = Math.round(performance.now() - startedAt);

  console.info("[StatRealm Perf]", {
    label,
    durationMs,
  });

  return { result, durationMs };
}
