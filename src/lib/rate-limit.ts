import { headers } from "next/headers";

// In-memory sliding-window rate limit (doc 08: login 5/15 min, checkout 5/10 min per IP).
// One process on one server, so memory is enough; it resets on restart, which is acceptable.

const hits = new Map<string, number[]>();

/** Records a hit and returns true when `key` is still within `limit` hits per `windowMs`. */
export function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 10_000) for (const [k, v] of hits) if (v.every((t) => now - t >= windowMs)) hits.delete(k);
  return true;
}

/** Number of failures recorded for `key` in the last `windowMs` (does not record anything). */
export function failures(key: string, windowMs: number): number {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  hits.set(key, recent);
  return recent.length;
}

/** Records one failure for `key` (used where only failed attempts count, e.g. admin login). */
export function recordFailure(key: string) {
  hits.set(key, [...(hits.get(key) ?? []), Date.now()]);
}

/** Client IP as forwarded by Caddy/Cloudflare; "unknown" when absent (dev). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("cf-connecting-ip") ??
    h.get("x-real-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  ).slice(0, 64);
}
