import "server-only";

export function isVercelRuntime() {
  return process.env.VERCEL === "1";
}

export function isFilesystemPersistenceEnabled() {
  return !isVercelRuntime() && process.env.STATREALM_DISABLE_FILE_DB !== "1";
}

export type KvRestConfig = {
  url: string;
  token: string;
};

export function getKvRestConfig(): KvRestConfig | null {
  const url =
    process.env.KV_REST_API_URL ??
    process.env.UPSTASH_REDIS_REST_URL ??
    process.env.STATREALM_KV_REST_API_URL;
  const token =
    process.env.KV_REST_API_TOKEN ??
    process.env.UPSTASH_REDIS_REST_TOKEN ??
    process.env.STATREALM_KV_REST_API_TOKEN;

  if (!url || !token) {
    return null;
  }

  return { url, token };
}

export function hasKvPersistenceConfig() {
  return getKvRestConfig() !== null;
}
