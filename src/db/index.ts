import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { lppeptideSqlite?: DatabaseSync };

function open(): DatabaseSync {
  // Runtime data path (outside the build): opt out of build-time file tracing.
  const file = resolve(/*turbopackIgnore: true*/ process.env.DATABASE_PATH ?? "./data/lppeptide.db");
  mkdirSync(dirname(file), { recursive: true });
  const conn = new DatabaseSync(file);
  // busy_timeout first: switching to WAL needs a brief lock, and several processes (build workers, PM2)
  // may open the file at the same moment.
  conn.exec("PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  return conn;
}

/** Raw handle. Use it for synchronous BEGIN … COMMIT transactions (doc 03). */
export const sqlite = globalForDb.lppeptideSqlite ?? open();
// Reuse one connection across dev hot reloads.
if (process.env.NODE_ENV !== "production") globalForDb.lppeptideSqlite = sqlite;

/** Drizzle over node:sqlite. The proxy driver expects rows as value arrays. */
export const db = drizzle(
  async (query, params, method) => {
    const stmt = sqlite.prepare(query);
    const args = params as SQLInputValue[];
    if (method === "run") {
      stmt.run(...args);
      return { rows: [] };
    }
    stmt.setReturnArrays(true);
    if (method === "get") {
      return { rows: stmt.get(...args) as unknown as unknown[] };
    }
    return { rows: stmt.all(...args) as unknown as unknown[][] };
  },
  { schema },
);
