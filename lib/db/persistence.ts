import "server-only";

import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";
import {
  getKvRestConfig,
  isFilesystemPersistenceEnabled,
  isVercelRuntime,
  type KvRestConfig,
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
    gameRatings: {},
    helpfulVotes: {},
    ratingAggregates: {},
    ratingSubmissionLogs: {},
    gameMetadata: {},
  };
}

function warnAboutEphemeralDbOnce() {
  if (warnedAboutEphemeralDb || !isVercelRuntime() || getKvRestConfig()) {
    return;
  }

  warnedAboutEphemeralDb = true;
  console.warn(
    "[StatRealm] Running on Vercel without KV/Upstash REST credentials. Synced users are kept in memory only for the current serverless instance and will not appear on the community leaderboard after logout.",
  );
}

async function readDbFromKv(config: KvRestConfig): Promise<StatRealmDb | null> {
  try {
    const response = await fetch(`${config.url}/get/${DB_KV_KEY}`, {
      headers: {
        Authorization: `Bearer ${config.token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(
        "[StatRealm] KV read failed",
        { status: response.status },
      );
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

async function writeDbToKv(config: KvRestConfig, db: StatRealmDb) {
  const response = await fetch(`${config.url}/set/${DB_KV_KEY}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
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
  const kvConfig = getKvRestConfig();

  if (kvConfig) {
    const db = await readDbFromKv(kvConfig);
    const resolved = db ?? createEmptyDb();
    const globalState = getGlobalDbState();
    globalState.__statrealmDb = resolved;
    globalState.__statrealmDbHydrated = true;
    return resolved;
  }

  if (isFilesystemPersistenceEnabled()) {
    const db = await readDbFromFile();
    const resolved = db ?? createEmptyDb();
    const globalState = getGlobalDbState();
    globalState.__statrealmDb = resolved;
    globalState.__statrealmDbHydrated = true;
    return resolved;
  }

  const globalState = getGlobalDbState();

  if (!globalState.__statrealmDbHydrated || !globalState.__statrealmDb) {
    globalState.__statrealmDb = createEmptyDb();
    globalState.__statrealmDbHydrated = true;
    warnAboutEphemeralDbOnce();
  }

  return globalState.__statrealmDb;
}

export async function writePersistedDb(db: StatRealmDb) {
  const globalState = getGlobalDbState();
  globalState.__statrealmDb = db;
  globalState.__statrealmDbHydrated = true;

  const kvConfig = getKvRestConfig();
  const persistenceTasks: Promise<void>[] = [];

  if (kvConfig) {
    persistenceTasks.push(writeDbToKv(kvConfig, db));
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
