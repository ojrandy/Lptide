"use server";

import { redirect } from "next/navigation";
import { sqlite } from "@/db";
import { formLocale, localePath } from "@/i18n/config";
import { orderPath } from "@/lib/order-token";
import { allow, clientIp } from "@/lib/rate-limit";
import { orderLookupSchema } from "@/lib/validation";

export type LookupState = { error?: string; values?: { number: string; email: string } };

/** Order lookup (v1 stand-in for accounts): order number + checkout email → tokenised order page. */
export async function lookupOrder(_prev: LookupState, form: FormData): Promise<LookupState> {
  const values = { number: String(form.get("number") ?? ""), email: String(form.get("email") ?? "") };
  const parsed = orderLookupSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the order number and email.", values };

  const ip = await clientIp();
  if (!allow(`lookup:${ip}`, 10, 15 * 60_000)) return { error: "Too many attempts. Please wait a few minutes.", values };

  const row = sqlite.prepare("SELECT number FROM orders WHERE number = ? AND email = ?").get(parsed.data.number, parsed.data.email) as
    | { number: string }
    | undefined;
  // Same message whether the number or the email is wrong (no order enumeration).
  if (!row) return { error: "We could not find an order with that number and email.", values };
  redirect(localePath(formLocale(form), orderPath(row.number)));
}
