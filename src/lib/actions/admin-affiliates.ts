"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { sqlite } from "@/db";
import { recordPayoutSync } from "@/lib/affiliate";
import { requireAdmin } from "@/lib/auth";
import { sendAffiliateDecision } from "@/lib/email";
import { getSettings } from "@/lib/queries/settings";
import type { FormState } from "./auth";

// Affiliate program admin (V2-4). requireAdmin() → Zod → write.

const id = z.coerce.number().int().positive();
const site = () => process.env.SITE_URL ?? "https://lppeptide.co";

const decideSchema = z.object({
  id,
  status: z.enum(["APPROVED", "REJECTED", "SUSPENDED"]),
  commissionPercent: z.coerce.number().int().min(0).max(50),
  adminNote: z.string().trim().max(2000).default(""),
});

/** Approve / reject / suspend, set the commission rate and the internal note. Emails the applicant on a decision. */
export async function decideAffiliate(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const p = decideSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Check the fields." };
  const before = sqlite
    .prepare("SELECT a.status, a.code, c.email FROM affiliates a JOIN customers c ON c.id = a.customerId WHERE a.id = ?")
    .get(p.data.id) as { status: string; code: string; email: string } | undefined;
  if (!before) return { error: "Affiliate not found." };
  sqlite
    .prepare("UPDATE affiliates SET status = ?, commissionPercent = ?, adminNote = ?, decidedAt = coalesce(decidedAt, ?) WHERE id = ?")
    .run(p.data.status, p.data.commissionPercent, p.data.adminNote, Date.now(), p.data.id);
  let message = "Saved.";
  if (before.status === "PENDING" && (p.data.status === "APPROVED" || p.data.status === "REJECTED")) {
    const ok = await sendAffiliateDecision(before.email, p.data.status === "APPROVED", `${site()}/account/affiliate/`, before.code, p.data.commissionPercent);
    message += ok ? " The applicant was emailed." : " The email to the applicant failed.";
  }
  revalidatePath("/admin/affiliates/");
  return { ok: message };
}

const payoutSchema = z.object({
  id,
  method: z.string().trim().min(2, "Enter the payout method (e.g. USDC on Ethereum).").max(80),
  reference: z.string().trim().min(2, "Enter the transaction reference.").max(200),
  note: z.string().trim().max(500).default(""),
});

/** Records a payout of every payable commission (hold period, minimum and monthly limit from Settings → Affiliate). */
export async function recordPayout(_prev: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const p = payoutSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Check the fields." };
  const { affiliate: rules } = await getSettings();
  sqlite.exec("BEGIN IMMEDIATE");
  let result: number | { error: string };
  try {
    result = recordPayoutSync(p.data.id, admin.id, p.data.method, p.data.reference, p.data.note, rules);
    sqlite.exec("COMMIT");
  } catch (err) {
    sqlite.exec("ROLLBACK");
    throw err;
  }
  if (typeof result !== "number") return result;
  revalidatePath(`/admin/affiliates/${p.data.id}/`);
  return { ok: `Payout of ${(result / 100).toFixed(2)} USD recorded.` };
}

const rulesSchema = z.object({
  commissionPercent: z.coerce.number().int().min(0).max(50),
  qualification: z.coerce.number().min(0).max(1_000_000),
  holdDays: z.coerce.number().int().min(0).max(365),
  minPayout: z.coerce.number().min(0).max(100_000),
  payoutsPerMonth: z.coerce.number().int().min(1).max(31),
});

export async function saveAffiliateRules(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const p = rulesSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Check the fields." };
  const value = {
    commissionPercent: p.data.commissionPercent,
    qualificationCents: Math.round(p.data.qualification * 100),
    holdDays: p.data.holdDays,
    minPayoutCents: Math.round(p.data.minPayout * 100),
    payoutsPerMonth: p.data.payoutsPerMonth,
  };
  sqlite.prepare("INSERT INTO settings (key, value) VALUES ('affiliate', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value").run(JSON.stringify(value));
  updateTag("settings");
  return { ok: "Program rules saved." };
}
