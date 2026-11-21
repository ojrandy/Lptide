import { randomInt } from "node:crypto";
import { sqlite } from "@/db";

// Affiliate program (V2-4). Synchronous SQL on the raw handle, so callers can run these inside their transaction.
//   referral  ?ref=CODE on any page → cookie lp_ref (30 days) + one click row per new cookie (src/proxy.ts)
//   order     placeOrder stores the approved affiliate (never the buyer themself) on the order
//   PAID      creates the commission: commissionPercent × product subtotal (shipping and handling excluded)
//   CANCELLED voids a commission that has not been paid out yet
//   hold      a commission becomes payable `holdDays` after it was earned (live: 30 days)
//   payout    the admin records a payout of every payable commission (live: minimum $100, at most 3 per month)

export const REF_COOKIE = "lp_ref";
export const REF_MAX_AGE = 30 * 24 * 60 * 60;
export const REF_CODE = /^[A-Z0-9]{4,16}$/;

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** A new unique referral code, e.g. LP7KQ9X2. */
export function newReferralCode(): string {
  for (;;) {
    let c = "LP";
    for (let i = 0; i < 6; i++) c += ALPHABET[randomInt(ALPHABET.length)];
    if (!sqlite.prepare("SELECT 1 FROM affiliates WHERE code = ?").get(c)) return c;
  }
}

/** Approved affiliate id for a referral code, or null. */
export function approvedAffiliateId(code: string): number | null {
  if (!REF_CODE.test(code)) return null;
  const row = sqlite.prepare("SELECT id FROM affiliates WHERE code = ? AND status = 'APPROVED'").get(code) as { id: number } | undefined;
  return row?.id ?? null;
}

export function recordClick(affiliateId: number, landingPath: string) {
  sqlite.prepare("INSERT INTO affiliate_clicks (affiliateId, landingPath, createdAt) VALUES (?, ?, ?)").run(affiliateId, landingPath.slice(0, 300), Date.now());
}

/** Commission for an order that just became PAID (idempotent: one per order). Returns the amount or null. */
export function earnCommissionSync(orderId: number): number | null {
  const o = sqlite
    .prepare(
      `SELECT o.subtotalCents, a.id affiliateId, a.commissionPercent, a.status FROM orders o JOIN affiliates a ON a.id = o.affiliateId WHERE o.id = ?`,
    )
    .get(orderId) as { subtotalCents: number; affiliateId: number; commissionPercent: number; status: string } | undefined;
  if (!o || o.status !== "APPROVED") return null;
  const amount = Math.floor((o.subtotalCents * o.commissionPercent) / 100);
  const res = sqlite
    .prepare(
      `INSERT INTO affiliate_commissions (affiliateId, orderId, baseCents, percent, amountCents, status, createdAt)
       VALUES (?, ?, ?, ?, ?, 'EARNED', ?) ON CONFLICT (orderId) DO NOTHING`,
    )
    .run(o.affiliateId, orderId, o.subtotalCents, o.commissionPercent, amount, Date.now());
  return res.changes ? amount : null;
}

/** Voids the unpaid commission of a cancelled order. Returns true when one was voided. */
export function voidCommissionSync(orderId: number): boolean {
  return sqlite.prepare("UPDATE affiliate_commissions SET status = 'VOID' WHERE orderId = ? AND status = 'EARNED'").run(orderId).changes > 0;
}

export type PayoutRules = { holdDays: number; minPayoutCents: number; payoutsPerMonth: number };

const holdCutoff = (holdDays: number) => Date.now() - holdDays * 86_400_000;

/** Sum of EARNED commissions past the hold period. */
export function payableCents(affiliateId: number, holdDays: number): number {
  return (
    sqlite
      .prepare("SELECT coalesce(sum(amountCents), 0) c FROM affiliate_commissions WHERE affiliateId = ? AND status = 'EARNED' AND createdAt <= ?")
      .get(affiliateId, holdCutoff(holdDays)) as { c: number }
  ).c;
}

/** Records a payout of every payable commission. Returns the amount paid, or a message why nothing can be paid. */
export function recordPayoutSync(
  affiliateId: number,
  adminId: number,
  method: string,
  reference: string,
  note: string,
  rules: PayoutRules,
): number | { error: string } {
  const cutoff = holdCutoff(rules.holdDays);
  const due = payableCents(affiliateId, rules.holdDays);
  if (due <= 0) return { error: "Nothing is payable yet (commissions stay on hold after payment)." };
  if (due < rules.minPayoutCents) return { error: `Payable amount is below the ${(rules.minPayoutCents / 100).toFixed(2)} USD minimum.` };
  const recent = (
    sqlite.prepare("SELECT count(*) n FROM affiliate_payouts WHERE affiliateId = ? AND createdAt >= ?").get(affiliateId, Date.now() - 30 * 86_400_000) as {
      n: number;
    }
  ).n;
  if (recent >= rules.payoutsPerMonth) return { error: `This affiliate already had ${recent} payouts in the last 30 days (limit ${rules.payoutsPerMonth}).` };
  const payoutId = Number(
    sqlite
      .prepare("INSERT INTO affiliate_payouts (affiliateId, amountCents, method, reference, note, adminId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(affiliateId, due, method, reference, note, adminId, Date.now()).lastInsertRowid,
  );
  sqlite
    .prepare("UPDATE affiliate_commissions SET status = 'PAID', payoutId = ? WHERE affiliateId = ? AND status = 'EARNED' AND createdAt <= ?")
    .run(payoutId, affiliateId, cutoff);
  return due;
}

/** Cumulative value of a customer's paid orders (affiliate qualification). */
export function paidOrderValueCents(customerId: number): number {
  return (
    sqlite
      .prepare("SELECT coalesce(sum(totalCents), 0) c FROM orders WHERE customerId = ? AND status IN ('PAID','PROCESSING','SHIPPED','DELIVERED')")
      .get(customerId) as { c: number }
  ).c;
}

export type AffiliateStats = {
  clicks: number;
  clicks30d: number;
  orders: number;
  paidOrders: number;
  earnedCents: number;
  paidOutCents: number;
  /** EARNED, past the hold period. */
  payableCents: number;
  /** EARNED, still on hold. */
  onHoldCents: number;
};

export function affiliateStats(affiliateId: number, holdDays: number): AffiliateStats {
  const since = Date.now() - 30 * 86_400_000;
  const one = <T>(sql: string, ...args: (number | string)[]) => sqlite.prepare(sql).get(...args) as T;
  const clicks = one<{ n: number; recent: number }>(
    "SELECT count(*) n, coalesce(sum(createdAt >= ?), 0) recent FROM affiliate_clicks WHERE affiliateId = ?",
    since,
    affiliateId,
  );
  const orders = one<{ n: number; paid: number }>(
    "SELECT count(*) n, coalesce(sum(status IN ('PAID','PROCESSING','SHIPPED','DELIVERED')), 0) paid FROM orders WHERE affiliateId = ?",
    affiliateId,
  );
  const c = one<{ earned: number; paid: number; due: number }>(
    `SELECT coalesce(sum(CASE WHEN status <> 'VOID' THEN amountCents END), 0) earned,
            coalesce(sum(CASE WHEN status = 'PAID' THEN amountCents END), 0) paid,
            coalesce(sum(CASE WHEN status = 'EARNED' THEN amountCents END), 0) due
       FROM affiliate_commissions WHERE affiliateId = ?`,
    affiliateId,
  );
  const payable = payableCents(affiliateId, holdDays);
  return {
    clicks: clicks.n,
    clicks30d: clicks.recent,
    orders: orders.n,
    paidOrders: orders.paid,
    earnedCents: c.earned,
    paidOutCents: c.paid,
    payableCents: payable,
    onHoldCents: c.due - payable,
  };
}
