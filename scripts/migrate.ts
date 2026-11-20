import "./env";
import { migrate } from "drizzle-orm/sqlite-proxy/migrator";
import { db, sqlite } from "../src/db";

async function main() {
  await migrate(
    db,
    async (queries) => {
      sqlite.exec("BEGIN");
      try {
        for (const query of queries) sqlite.exec(query);
        sqlite.exec("COMMIT");
      } catch (err) {
        sqlite.exec("ROLLBACK");
        throw err;
      }
    },
    { migrationsFolder: "./drizzle" },
  );
  console.log("Migrations applied.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => sqlite.close());
