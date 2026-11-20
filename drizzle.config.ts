import { defineConfig } from "drizzle-kit";

// Generate only. Migrations are applied by scripts/migrate.ts (sqlite-proxy migrator over node:sqlite).
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
});
