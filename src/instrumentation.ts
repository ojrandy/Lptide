// Runs once per server start. The Namecheap host has no shell (docs/08), so the server sets itself up:
// 1. first start only: copy the catalog DB and product images shipped in initial-data/ into the data folder,
// 2. apply pending migrations (no-op when current),
// 3. if no admin exists yet, create one from ADMIN_EMAIL / ADMIN_PASSWORD.
// Existing data is never overwritten.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { cpSync, existsSync, mkdirSync, readdirSync } = await import("node:fs");
  const { dirname, join, resolve } = await import("node:path");

  const seed = resolve(/*turbopackIgnore: true*/ process.cwd(), "initial-data");
  const dbFile = resolve(/*turbopackIgnore: true*/ process.env.DATABASE_PATH ?? "./data/lppeptide.db");
  const uploads = resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR ?? "./uploads");
  try {
    if (!existsSync(dbFile) && existsSync(join(seed, "lppeptide.db"))) {
      mkdirSync(dirname(dbFile), { recursive: true });
      cpSync(join(seed, "lppeptide.db"), dbFile);
      console.log("First start: catalog database installed.");
    }
    if (existsSync(join(seed, "uploads")) && (!existsSync(uploads) || readdirSync(uploads).length === 0)) {
      cpSync(join(seed, "uploads"), uploads, { recursive: true });
      console.log("First start: product images installed.");
    }
  } catch (err) {
    console.error("First-start setup failed:", err);
  }

  const { runMigrations } = await import("./db/migrate");
  try {
    await runMigrations();
  } catch (err) {
    // Another process started at the same moment may have applied them first; log and keep serving.
    console.error("Startup migrations failed:", err);
  }

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (email && password) {
    try {
      const { db } = await import("./db");
      const { admins } = await import("./db/schema");
      if (!(await db.select({ id: admins.id }).from(admins).limit(1)).length) {
        const bcrypt = (await import("bcryptjs")).default;
        await db.insert(admins).values({ email, passwordHash: await bcrypt.hash(password, 12) });
        console.log(`First start: admin ${email} created.`);
      }
    } catch (err) {
      console.error("Admin bootstrap failed:", err);
    }
  }
}
