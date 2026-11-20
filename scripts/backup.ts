// Nightly backup (doc 08): consistent DB snapshot + uploads archive, 14 days kept.
// Usage: npm run backup   (BACKUP_DIR defaults to ./backups). Copy the folder offsite (e.g. rclone) afterwards.
import "./env";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const KEEP_DAYS = 14;
const dbFile = resolve(process.env.DATABASE_PATH ?? "./data/lppeptide.db");
const uploads = resolve(process.env.UPLOAD_DIR ?? "./uploads");
const out = resolve(process.env.BACKUP_DIR ?? "./backups");
mkdirSync(out, { recursive: true });

const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
const dbOut = join(out, `lp-${stamp}.db`);
const upOut = join(out, `uploads-${stamp}.tar.gz`);

// VACUUM INTO writes a consistent copy while the app keeps running (WAL mode).
const db = new DatabaseSync(dbFile);
db.exec("PRAGMA busy_timeout = 10000");
db.prepare("VACUUM INTO ?").run(dbOut);
db.close();
console.log(`database → ${dbOut}`);

if (existsSync(uploads)) {
  // Relative paths from the uploads parent: GNU tar on Windows reads "d:" in an absolute path as a remote host.
  const cwd = dirname(uploads);
  execFileSync("tar", ["-czf", relative(cwd, upOut), basename(uploads)], { cwd });
  console.log(`uploads  → ${upOut}`);
}

const cutoff = Date.now() - KEEP_DAYS * 86_400_000;
for (const f of readdirSync(out)) {
  const p = join(out, f);
  if (/^(lp-|uploads-)/.test(f) && statSync(p).mtimeMs < cutoff) {
    unlinkSync(p);
    console.log(`pruned   ${f}`);
  }
}
