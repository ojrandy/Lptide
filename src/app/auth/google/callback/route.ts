import { NextResponse, type NextRequest } from "next/server";
import { sqlite } from "@/db";
import { markVerifiedAndLinkOrders, setCustomerCookie } from "@/lib/customer-auth";
import { finishGoogle, OAUTH_COOKIE } from "@/lib/google-oauth";

// GET /auth/google/callback/ — Google sends the user back here. Finds the account by Google id, then by verified
// email (links Google to an existing email account), else creates one; links past orders; sets the session.
export async function GET(req: NextRequest) {
  const result = await finishGoogle(req.nextUrl.origin, req.nextUrl.searchParams, req.cookies.get(OAUTH_COOKIE)?.value);
  if ("error" in result) {
    const res = NextResponse.redirect(new URL(`/login/?error=google-${result.error}`, req.url));
    res.cookies.delete({ name: OAUTH_COOKIE, path: "/auth/google/" });
    return res;
  }
  const { profile, next } = result;

  let id = (sqlite.prepare("SELECT id FROM customers WHERE googleSub = ?").get(profile.sub) as { id: number } | undefined)?.id;
  if (!id) {
    const byEmail = sqlite.prepare("SELECT id, googleSub, emailVerifiedAt FROM customers WHERE email = ?").get(profile.email) as
      | { id: number; googleSub: string | null; emailVerifiedAt: number | null }
      | undefined;
    if (byEmail && byEmail.googleSub && byEmail.googleSub !== profile.sub)
      return NextResponse.redirect(new URL("/login/?error=google-conflict", req.url));
    if (byEmail) {
      // An unverified password may have been set by someone else who registered this email first (pre-hijack):
      // the Google owner of the address takes the account over and that password stops working.
      if (byEmail.emailVerifiedAt == null) sqlite.prepare("UPDATE customers SET passwordHash = NULL WHERE id = ?").run(byEmail.id);
      sqlite.prepare("UPDATE customers SET googleSub = ? WHERE id = ?").run(profile.sub, byEmail.id);
      id = byEmail.id;
    } else {
      id = Number(
        sqlite
          .prepare("INSERT INTO customers (email, name, googleSub, emailVerifiedAt, createdAt) VALUES (?, ?, ?, ?, ?)")
          .run(profile.email, profile.name, profile.sub, Date.now(), Date.now()).lastInsertRowid,
      );
    }
  }
  // Google verified the email (email_verified): safe to link guest orders placed with it.
  markVerifiedAndLinkOrders(id);
  await setCustomerCookie(id);

  const res = NextResponse.redirect(new URL(next, req.url));
  res.cookies.delete({ name: OAUTH_COOKIE, path: "/auth/google/" });
  res.headers.set("X-Robots-Tag", "noindex");
  return res;
}
