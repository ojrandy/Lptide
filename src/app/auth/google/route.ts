import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/customer-auth";
import { googleEnabled, OAUTH_COOKIE, startGoogle } from "@/lib/google-oauth";

// GET /auth/google/?next=/account/ → Google consent screen (docs/10 V1).
export async function GET(req: NextRequest) {
  if (!googleEnabled()) return NextResponse.redirect(new URL("/login/?error=google-off", req.url));
  const { url, cookie } = await startGoogle(req.nextUrl.origin, safeNext(req.nextUrl.searchParams.get("next")));
  const res = NextResponse.redirect(url);
  res.cookies.set(OAUTH_COOKIE, cookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // sent on Google's top-level redirect back to us
    path: "/auth/google/",
    maxAge: 600,
  });
  res.headers.set("X-Robots-Tag", "noindex");
  return res;
}
