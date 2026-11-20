import { createHmac, timingSafeEqual } from "node:crypto";

// /order/{number}/?t=… — the token is an HMAC of the order number keyed with AUTH_SECRET (doc 02),
// so knowing an order number is not enough to open the order page.

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET must be set (at least 32 characters). See .env.example.");
  return s;
}

export function orderToken(number: string): string {
  return createHmac("sha256", secret()).update(`order:${number.toUpperCase()}`).digest("base64url").slice(0, 32);
}

export function verifyOrderToken(number: string, token: string | undefined | null): boolean {
  if (!token) return false;
  const a = Buffer.from(orderToken(number));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const orderPath = (number: string) => `/order/${number}/?t=${orderToken(number)}`;
