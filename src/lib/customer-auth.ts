import { createHash } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sqlite } from "@/db";

// Customer accounts (V2-1, docs/10 V1–V2). Same building blocks as the admin session (lib/auth.ts), separate cookie
// and audience so an admin token can never be used as a customer token or the other way round.
//   session  `lp_customer`: HS256 JWT {sub, aud: "customer", pv}, 30 days. `pv` is a fingerprint of the password hash,
//            so changing or resetting the password signs out every other session.
//   tokens   email verification (2 days) and password reset (1 hour, single use through `pv`), sent by email.
// Orders are linked to the account by email only once the email is verified.

export const CUSTOMER_COOKIE = "lp_customer";
/** Not a credential: only tells the browser to sync the cart with the account (cart-widgets.tsx). */
export const ACCOUNT_HINT_COOKIE = "lp_acct";
const MAX_AGE = 30 * 24 * 60 * 60;

function key(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET must be set (at least 32 characters). See .env.example.");
  return new TextEncoder().encode(s);
}

/** Fingerprint of the password hash ("" when the account has none): changes whenever the password changes. */
export const passwordVersion = (hash: string | null) => (hash ? createHash("sha256").update(hash).digest("base64url").slice(0, 12) : "");

type Purpose = "customer" | "verify" | "reset";

async function sign(purpose: Purpose, sub: number, claims: Record<string, string>, ttlSeconds: number) {
  return new SignJWT(claims).setProtectedHeader({ alg: "HS256" }).setAudience(purpose).setSubject(String(sub)).setIssuedAt().setExpirationTime(`${ttlSeconds}s`).sign(key());
}

async function verify(purpose: Purpose, token: string | undefined | null) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"], audience: purpose });
    const id = Number(payload.sub);
    return Number.isInteger(id) && id > 0 ? { id, claims: payload as Record<string, unknown> } : null;
  } catch {
    return null;
  }
}

export type CustomerUser = { id: number; email: string; name: string; emailVerified: boolean; hasPassword: boolean; google: boolean };

type Row = { id: number; email: string; name: string; passwordHash: string | null; googleSub: string | null; emailVerifiedAt: number | null };
const byId = (id: number) =>
  sqlite.prepare("SELECT id, email, name, passwordHash, googleSub, emailVerifiedAt FROM customers WHERE id = ?").get(id) as Row | undefined;

const toUser = (r: Row): CustomerUser => ({
  id: r.id,
  email: r.email,
  name: r.name,
  emailVerified: r.emailVerifiedAt != null,
  hasPassword: !!r.passwordHash,
  google: !!r.googleSub,
});

export async function setCustomerCookie(customerId: number) {
  const row = byId(customerId);
  if (!row) return;
  sqlite.prepare("UPDATE customers SET lastLoginAt = ? WHERE id = ?").run(Date.now(), customerId);
  (await cookies()).set(CUSTOMER_COOKIE, await sign("customer", customerId, { pv: passwordVersion(row.passwordHash) }, MAX_AGE), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
  (await cookies()).set(ACCOUNT_HINT_COOKIE, "1", { sameSite: "lax", path: "/", maxAge: MAX_AGE, secure: process.env.NODE_ENV === "production" });
}

export async function clearCustomerCookie() {
  const jar = await cookies();
  jar.delete(CUSTOMER_COOKIE);
  jar.delete(ACCOUNT_HINT_COOKIE);
}

/** The signed-in customer, or null. Reads cookies, so the caller renders dynamically (wrap in <Suspense>). */
export async function getCustomer(): Promise<CustomerUser | null> {
  const v = await verify("customer", (await cookies()).get(CUSTOMER_COOKIE)?.value);
  if (!v) return null;
  const row = byId(v.id);
  if (!row || v.claims.pv !== passwordVersion(row.passwordHash)) return null;
  return toUser(row);
}

/** The signed-in customer, or redirect to the sign-in page (back to `next` afterwards). */
export async function requireCustomer(next: string): Promise<CustomerUser> {
  const c = await getCustomer();
  if (!c) redirect(`/login/?next=${encodeURIComponent(next)}`);
  return c;
}

export const verifyToken = (customerId: number, email: string) => sign("verify", customerId, { email }, 2 * 24 * 60 * 60);

/** Customer id when the verification token is valid for the account's current email. */
export async function checkVerifyToken(token: string | null | undefined): Promise<number | null> {
  const v = await verify("verify", token);
  const row = v && byId(v.id);
  return row && row.email === v.claims.email ? row.id : null;
}

export async function resetToken(customerId: number) {
  return sign("reset", customerId, { pv: passwordVersion(byId(customerId)?.passwordHash ?? null) }, 60 * 60);
}

/** Customer id when the reset token is valid and unused (the password has not changed since it was issued). */
export async function checkResetToken(token: string | null | undefined): Promise<number | null> {
  const v = await verify("reset", token);
  const row = v && byId(v.id);
  return row && v.claims.pv === passwordVersion(row.passwordHash) ? row.id : null;
}

/** Marks the email verified and attaches guest orders placed with it (docs/10 V2). Returns how many were linked. */
export function markVerifiedAndLinkOrders(customerId: number): number {
  const row = byId(customerId);
  if (!row) return 0;
  if (row.emailVerifiedAt == null) sqlite.prepare("UPDATE customers SET emailVerifiedAt = ? WHERE id = ?").run(Date.now(), customerId);
  return Number(sqlite.prepare("UPDATE orders SET customerId = ? WHERE email = ? AND customerId IS NULL").run(customerId, row.email).changes);
}

/** Only same-site relative paths are allowed as a post-login destination (no open redirect). */
export function safeNext(next: unknown, fallback = "/account/"): string {
  const n = typeof next === "string" ? next : "";
  return /^\/(?![/\\])[\w\-./?=&%#]*$/.test(n) && !n.startsWith("/admin") ? n : fallback;
}
