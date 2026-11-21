import { createHash, randomBytes } from "node:crypto";
import { createRemoteJWKSet, jwtVerify, SignJWT } from "jose";

// Google sign-in for customers (docs/10 V1): OpenID Connect authorization code flow with PKCE.
// The state, PKCE verifier and post-login path travel in a short-lived signed cookie (`lp_oauth`, 10 min).
// The id_token is verified with Google's published keys (issuer + audience + expiry); only verified emails are used.
// Disabled unless GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set.

export const OAUTH_COOKIE = "lp_oauth";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const jwks = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export const googleEnabled = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

const key = () => new TextEncoder().encode(process.env.AUTH_SECRET ?? "");
const b64url = (b: Buffer) => b.toString("base64url");

/** Redirect URI registered in the Google console: {SITE_URL}/auth/google/callback/ (the request origin in dev). */
export function redirectUri(origin: string) {
  const base = process.env.NODE_ENV === "production" && process.env.SITE_URL ? process.env.SITE_URL : origin;
  return `${base.replace(/\/$/, "")}/auth/google/callback/`;
}

export async function startGoogle(origin: string, next: string) {
  const state = b64url(randomBytes(24));
  const verifier = b64url(randomBytes(48));
  const challenge = b64url(createHash("sha256").update(verifier).digest());
  const cookie = await new SignJWT({ state, verifier, next }).setProtectedHeader({ alg: "HS256" }).setAudience("oauth").setExpirationTime("10m").sign(key());
  const url = new URL(AUTH_URL);
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(origin),
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return { url: url.toString(), cookie };
}

export type GoogleProfile = { sub: string; email: string; name: string };

/** Exchanges the code and returns the verified Google profile, or an error code for the sign-in page. */
export async function finishGoogle(
  origin: string,
  params: URLSearchParams,
  cookie: string | undefined,
): Promise<{ profile: GoogleProfile; next: string } | { error: string }> {
  if (!cookie) return { error: "expired" };
  let saved: { state: string; verifier: string; next: string };
  try {
    saved = (await jwtVerify(cookie, key(), { algorithms: ["HS256"], audience: "oauth" })).payload as typeof saved;
  } catch {
    return { error: "expired" };
  }
  if (params.get("error")) return { error: "cancelled" };
  const code = params.get("code");
  if (!code || params.get("state") !== saved.state) return { error: "state" };

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(origin),
      grant_type: "authorization_code",
      code_verifier: saved.verifier,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return { error: "token" };
  const { id_token } = (await res.json()) as { id_token?: string };
  if (!id_token) return { error: "token" };
  try {
    const { payload } = await jwtVerify(id_token, jwks, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: process.env.GOOGLE_CLIENT_ID!,
    });
    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    if (!payload.sub || !email || payload.email_verified !== true) return { error: "unverified" };
    return { profile: { sub: payload.sub, email, name: typeof payload.name === "string" ? payload.name.slice(0, 120) : "" }, next: saved.next };
  } catch {
    return { error: "token" };
  }
}
