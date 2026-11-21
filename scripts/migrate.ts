import "./env";
import { sqlite } from "../src/db";
import { runMigrations } from "../src/db/migrate";

runMigrations()
  .then(() => console.log("Migrations applied."))
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => sqlite.close());
