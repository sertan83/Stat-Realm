import "server-only";

import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";
import {
  hasKvPersistenceConfig,
  isFilesystemPersistenceEnabled,
  isVercelRuntime,
} from "@/lib/storage/runtime";
import type { StatRealmDb } from "@/lib/db/types";

const DB_KV_KEY = "statrealm-db";
const DB_FILE_PATH = path.join(process.cwd(), ".data", "statrealm-db.json");

let warnedAboutEphemeralDb = false;

type GlobalDbState = typeof globalThis & {
  __statrealmDb?: StatRealmDb;
  __statrealmDbHydrated?: boolean;
};

function getGlobalDbState(): GlobalDbState {
  return globalThis as GlobalDbState;
}

export function createEmptyDb(): StatRealmDb {
  return {
    users: {},
    libraries: {},
    achievementHistories: {},
    profileAnalytics: {},
    aggregates: {
      mostPlayed: [],
      mostOwned: [],
      updatedAt: null,
    },
  };
}

function warnAboutEphemeralDbOnce() {
  if (warnedAboutEphemeralDb || !isVercelRuntime() || hasKvPersistenceConfig()) {
    return;
  }

  warnedAboutEphemeralDb = true;
  console.warn(
    "[StatRealm] Running on Vercel without KV_REST_API_URL/KV_REST_API_TOKEN. Database changes are kept in memory only for the current serverless instance.",
  );
}

async function readDbFromKv(): Promise<StatRealmDb | null> {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    return null;
  }

  try {
    const response = await fetch(`${url}/get/${DB_KV_KEY}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { result?: string | null };
    if (!payload.result) {
      return null;
    }

    return JSON.parse(payload.result) as StatRealmDb;
  } catch (error) {
    console.error("[StatRealm] Failed to read database from KV", error);
    return null;
  }
}

async function writeDbToKv(db: StatRealmDb) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    return;
  }

  const response = await fetch(`${url}/set/${DB_KV_KEY}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(db),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`KV write failed with status ${response.status}`);
  }
}

async function readDbFromFile(): Promise<StatRealmDb | null> {
  try {
    const raw = await readFile(DB_FILE_PATH, "utf8");
    return JSON.parse(raw) as StatRealmDb;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return null;
    }

    throw error;
  }
}

async function writeDbToFile(db: StatRealmDb) {
  await mkdir(path.dirname(DB_FILE_PATH), { recursive: true });
  const tempPath = `${DB_FILE_PATH}.tmp`;
  await writeFile(tempPath, JSON.stringify(db, null, 2), "utf8");
  await rename(tempPath, DB_FILE_PATH);
}

export async function readPersistedDb(): Promise<StatRealmDb> {
  const globalState = getGlobalDbState();

  if (globalState.__statrealmDbHydrated && globalState.__statrealmDb) {
    return globalState.__statrealmDb;
  }

  let db: StatRealmDb | null = null;

  if (hasKvPersistenceConfig()) {
    db = await readDbFromKv();
  }

  if (!db && isFilesystemPersistenceEnabled()) {
    db = await readDbFromFile();
  }

  const resolved = db ?? createEmptyDb();
  globalState.__statrealmDb = resolved;
  globalState.__statrealmDbHydrated = true;
  warnAboutEphemeralDbOnce();

  return resolved;
}

export async function writePersistedDb(db: StatRealmDb) {
  const globalState = getGlobalDbState();
  globalState.__statrealmDb = db;
  globalState.__statrealmDbHydrated = true;

  const persistenceTasks: Promise<void>[] = [];

  if (hasKvPersistenceConfig()) {
    persistenceTasks.push(writeDbToKv(db));
  }

  if (isFilesystemPersistenceEnabled()) {
    persistenceTasks.push(writeDbToFile(db));
  }

  if (persistenceTasks.length === 0) {
    warnAboutEphemeralDbOnce();
    return;
  }

  await Promise.all(persistenceTasks);
}
