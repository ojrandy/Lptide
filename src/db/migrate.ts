import { resolve } from "node:path";
import { migrate } from "drizzle-orm/sqlite-proxy/migrator";
import { db, sqlite } from "./index";

/** Applies pending drizzle/ migrations. Used by `npm run db:migrate` and at server start (src/instrumentation.ts). */
export async function runMigrations(): Promise<void> {
  await migrate(
    db,
    async (queries) => {
      sqlite.exec("BEGIN IMMEDIATE");
      try {
        for (const query of queries) sqlite.exec(query);
        sqlite.exec("COMMIT");
      } catch (err) {
        sqlite.exec("ROLLBACK");
        throw err;
      }
    },
    // Read at runtime from the deployed drizzle/ folder (copied next to server.js), not traced into the build.
    { migrationsFolder: resolve(/*turbopackIgnore: true*/ process.cwd(), "drizzle") },
  );
}
