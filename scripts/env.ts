// Load .env.local / .env for CLI scripts (Next loads them itself at runtime).
// Import this first: it must run before src/db reads DATABASE_PATH. Existing env vars win.
import { existsSync } from "node:fs";

for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) process.loadEnvFile(file);
}
