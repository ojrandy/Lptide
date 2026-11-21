"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { sqlite } from "@/db";
import { newReferralCode, paidOrderValueCents } from "@/lib/affiliate";
import { getCustomer } from "@/lib/customer-auth";
import { sendStoreNotice } from "@/lib/email";
import { getSettings } from "@/lib/queries/settings";
import { allow } from "@/lib/rate-limit";
import type { AccountState } from "./customer";

// Affiliate application (V2-4): signed-in customer with a verified email and the published qualifying order value.

const applySchema = z.object({
  website: z.string().trim().max(300),
  audience: z.string().trim().min(10, "Tell us a little about your audience (10 characters or more).").max(2000),
  payoutDetails: z.string().trim().min(4, "Tell us how to pay you.").max(500),
  agree: z.literal("on", { message: "Please confirm the research-use-only promotion rule." }),
});

export async function applyAffiliate(_prev: AccountState, form: FormData): Promise<AccountState> {
  const c = await getCustomer();
  if (!c) return { error: "Please sign in again." };
  if (!c.emailVerified) return { error: "Confirm your email address first." };
  const p = applySchema.safeParse({
    website: String(form.get("website") ?? ""),
    audience: String(form.get("audience") ?? ""),
    payoutDetails: String(form.get("payoutDetails") ?? ""),
    agree: form.get("agree") ?? "",
  });
  if (!p.success) return { error: p.error.issues[0]?.message };
  if (p.data.website && !/^https?:\/\/\S+$/.test(p.data.website) && !/^@?\w[\w.]{1,60}$/.test(p.data.website))
    return { error: "Website: a full link (https://…) or a @handle." };
  if (!allow(`affiliate-apply:${c.id}`, 3, 60 * 60_000)) return { error: "Please wait a little before trying again." };

  const { affiliate: rules, storeInbox, contact } = await getSettings();
  const current = paidOrderValueCents(c.id);
  if (current < rules.qualificationCents) return { error: "Your paid orders have not reached the qualifying value yet." };
  if (sqlite.prepare("SELECT 1 FROM affiliates WHERE customerId = ?").get(c.id)) return { error: "You have already applied." };

  sqlite
    .prepare(
      `INSERT INTO affiliates (customerId, code, status, commissionPercent, website, audience, payoutDetails, createdAt)
       VALUES (?, ?, 'PENDING', ?, ?, ?, ?, ?)`,
    )
    .run(c.id, newReferralCode(), rules.commissionPercent, p.data.website, p.data.audience, p.data.payoutDetails, Date.now());
  const site = process.env.SITE_URL ?? "https://lppeptide.co";
  after(() =>
    sendStoreNotice(storeInbox || contact.email, `New affiliate application: ${c.email}`, [`${c.name || c.email} applied to the affiliate program.`, p.data.audience], `${site}/admin/affiliates/`),
  );
  revalidatePath("/account/affiliate/");
  return { ok: "Application sent." };
}
