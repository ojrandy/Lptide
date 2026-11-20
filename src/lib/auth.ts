import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sqlite } from "@/db";

// Admin session (doc 07): JWT (HS256, jose) in the httpOnly cookie `lp_admin`, 8 hours.
// proxy.ts gates /admin/* for convenience; every admin page and Server Action calls requireAdmin() itself.

export const SESSION_COOKIE = "lp_admin";
const MAX_AGE = 8 * 60 * 60;

function key(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET must be set (at least 32 characters). See .env.example.");
  return new TextEncoder().encode(s);
}

export async function signSession(adminId: number): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(adminId))
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(key());
}

/** Admin id from a session token, or null if missing, forged or expired. */
export async function verifySession(token: string | undefined): Promise<number | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    const id = Number(payload.sub);
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

export async function setSessionCookie(adminId: number) {
  (await cookies()).set(SESSION_COOKIE, await signSession(adminId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

export type AdminUser = { id: number; email: string };

/** The signed-in admin, or redirect to /admin/login. The admin row must still exist (deleted admins lose access). */
export async function requireAdmin(): Promise<AdminUser> {
  const id = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  const admin = id ? (sqlite.prepare("SELECT id, email FROM admins WHERE id = ?").get(id) as AdminUser | undefined) : undefined;
  if (!admin) redirect("/admin/login/");
  return admin;
}
