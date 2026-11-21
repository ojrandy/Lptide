// Runs once per server start. The Namecheap host has no shell, so pending migrations are applied here
// on every deploy (docs/08). A no-op when the schema is current.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { runMigrations } = await import("./db/migrate");
  try {
    await runMigrations();
  } catch (err) {
    // Another process started at the same moment may have applied them first; log and keep serving.
    console.error("Startup migrations failed:", err);
  }
}
