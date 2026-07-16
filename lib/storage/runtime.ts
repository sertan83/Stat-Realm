import "server-only";

export function isVercelRuntime() {
  return process.env.VERCEL === "1";
}

export function isFilesystemPersistenceEnabled() {
  return !isVercelRuntime() && process.env.STATREALM_DISABLE_FILE_DB !== "1";
}

export function hasKvPersistenceConfig() {
  return Boolean(
    process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN,
  );
}
