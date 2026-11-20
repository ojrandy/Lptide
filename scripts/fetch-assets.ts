// Downloads product images from the live site into UPLOAD_DIR/products (seed rewrites paths to /uploads/products/<file>).
// Polite: ~1 request/second, skips files already present. Run before the DNS cutover: the old site is the only source.
// Usage: npm run assets:fetch
import "./env";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const LIVE = "https://lppeptide.com";
const UPLOAD_DIR = resolve(process.env.UPLOAD_DIR ?? "./uploads");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function download(url: string, dest: string) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (asset migration)" } });
    if (res.ok && /^image\//.test(res.headers.get("content-type") ?? "")) {
      writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
      return true;
    }
    if (res.status !== 503 && res.status !== 429) {
      console.warn(`  ${res.status} ${url}`);
      return false;
    }
    await sleep(3000 * attempt); // rate-limited: back off
  }
  return false;
}

async function main() {
  const dir = join(UPLOAD_DIR, "products");
  mkdirSync(dir, { recursive: true });

  const detail = "_capture/products/detail";
  const paths = new Set<string>();
  for (const f of readdirSync(detail)) {
    const p = JSON.parse(readFileSync(join(detail, f), "utf8")) as { imageUrl?: string; imageUrls?: string[] };
    for (const u of [p.imageUrl, ...(p.imageUrls ?? [])]) if (u?.startsWith("/biz/files/")) paths.add(u);
  }

  let fetched = 0, skipped = 0, failed = 0;
  for (const path of paths) {
    const dest = join(dir, basename(path));
    if (existsSync(dest)) { skipped++; continue; }
    if (await download(`${LIVE}/api${path}`, dest)) fetched++;
    else failed++;
    await sleep(1000);
  }
  console.log(`products: ${paths.size} images · fetched ${fetched} · already present ${skipped} · failed ${failed}`);
  if (failed) process.exitCode = 1;
}

main();
