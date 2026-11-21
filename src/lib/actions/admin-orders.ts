"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { sqlite } from "@/db";
import { ORDER_STATUSES, type OrderStatus } from "@/db/schema";
import { orderEmailData, TRANSITIONS } from "@/lib/admin/orders";
import { requireAdmin } from "@/lib/auth";
import { earnCommissionSync, voidCommissionSync } from "@/lib/affiliate";
import { sendNewOrderToStore, sendOrderConfirmation, sendOrderShipped, sendPaymentConfirmed } from "@/lib/email";
import { recordEmailFailure, restoreStockSync } from "@/lib/orders";
import { saveUpload } from "@/lib/uploads";
import { getSettings } from "@/lib/queries/settings";
import type { FormState } from "./auth";

const statusSchema = z.object({
  orderId: z.coerce.number().int().positive(),
  to: z.enum(ORDER_STATUSES),
  carrier: z.string().trim().max(60).default(""),
  trackingNumber: z
    .string()
    .trim()
    .max(80)
    .regex(/^[A-Za-z0-9 -]*$/, "Tracking number: letters, digits, spaces and dashes only.")
    .default(""),
  note: z.string().trim().max(500).default(""),
});

/**
 * Moves an order along the state machine (doc 04).
 *   PAID       optional proof file (private) + note; sets paidAt; earns the affiliate commission; emails the customer
 *   SHIPPED    needs a carrier from the settings list + tracking number; emails the customer with the tracking link
 *   CANCELLED  returns counted stock and voids an unpaid affiliate commission
 */
export async function updateOrderStatus(_prev: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = statusSchema.safeParse(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the fields." };
  const { orderId, to, carrier, trackingNumber, note } = parsed.data;
  const settings = await getSettings();
  if (to === "SHIPPED" && (!carrier || !trackingNumber)) return { error: "Shipping needs the carrier and the tracking number." };
  if (to === "SHIPPED" && !settings.carriers.some((c) => c.name === carrier)) return { error: "Choose a carrier from the list (Settings → Carriers)." };

  // Proof of payment (docs/10 V9): stored before the transaction; a failed check stops the status change.
  let proof: string | null = null;
  const file = form.get("proof");
  if (to === "PAID" && file instanceof File && file.size > 0) {
    const saved = await saveUpload(file, "payment-proofs", ["jpg", "png", "webp", "pdf"]);
    if ("error" in saved) return { error: `Proof file: ${saved.error}` };
    proof = saved.name;
  }
  let commission: number | null = null;
  let voided = false;

  sqlite.exec("BEGIN IMMEDIATE");
  try {
    const row = sqlite.prepare("SELECT status FROM orders WHERE id = ?").get(orderId) as { status: OrderStatus } | undefined;
    if (!row) throw new Error("Order not found.");
    if (!TRANSITIONS[row.status].includes(to)) throw new Error(`An order that is ${row.status} cannot move to ${to}.`);
    const now = Date.now();
    if (to === "SHIPPED")
      sqlite
        .prepare("UPDATE orders SET status = ?, carrier = ?, trackingNumber = ?, updatedAt = ? WHERE id = ?")
        .run(to, carrier, trackingNumber, now, orderId);
    else if (to === "PAID")
      sqlite
        .prepare("UPDATE orders SET status = ?, paidAt = ?, paymentProof = coalesce(?, paymentProof), updatedAt = ? WHERE id = ?")
        .run(to, now, proof, now, orderId);
    else sqlite.prepare("UPDATE orders SET status = ?, updatedAt = ? WHERE id = ?").run(to, now, orderId);
    if (to === "PAID") commission = earnCommissionSync(orderId);
    if (to === "CANCELLED") {
      restoreStockSync(orderId);
      voided = voidCommissionSync(orderId);
    }
    sqlite
      .prepare("INSERT INTO order_events (orderId, fromStatus, toStatus, note, adminId, createdAt) VALUES (?, ?, ?, ?, ?, ?)")
      .run(orderId, row.status, to, [note, proof ? "Payment proof attached" : ""].filter(Boolean).join(" · "), admin.id, now);
    sqlite.exec("COMMIT");
  } catch (err) {
    sqlite.exec("ROLLBACK");
    return { error: err instanceof Error ? err.message : "Could not update the order." };
  }

  let message = `Order marked ${to.replace("_", " ").toLowerCase()}.`;
  if (commission != null) message += ` Affiliate commission ${(commission / 100).toFixed(2)} USD recorded.`;
  if (voided) message += " Affiliate commission voided.";
  if (to === "CANCELLED") updateTag("products"); // stock may have come back
  const { contact } = settings;
  if (to === "SHIPPED" || to === "PAID") {
    const data = await orderEmailData(orderId);
    const sent = data && (to === "SHIPPED" ? await sendOrderShipped(data, contact.email) : await sendPaymentConfirmed(data, contact.email));
    if (sent) message += to === "SHIPPED" ? " Shipped email sent to the customer." : " Payment confirmation sent to the customer.";
    else {
      recordEmailFailure(orderId, to === "SHIPPED" ? "shipped notification" : "payment confirmation");
      message += " The email failed: use Resend below.";
    }
  }
  revalidatePath(`/admin/orders/${orderId}/`);
  return { ok: message };
}

const noteSchema = z.object({ orderId: z.coerce.number().int().positive(), adminNote: z.string().max(5000) });

export async function saveAdminNote(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = noteSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Note is too long (5000 characters max)." };
  sqlite
    .prepare("UPDATE orders SET adminNote = ?, updatedAt = ? WHERE id = ?")
    .run(parsed.data.adminNote.trim(), Date.now(), parsed.data.orderId);
  revalidatePath(`/admin/orders/${parsed.data.orderId}/`);
  return { ok: "Note saved." };
}

const resendSchema = z.object({
  orderId: z.coerce.number().int().positive(),
  kind: z.enum(["confirmation", "store", "shipped", "paid"]),
});

/** Resends an order email (e.g. after an "Email failed" event, or when the customer lost it). */
export async function resendOrderEmail(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = resendSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Unknown email." };
  const { orderId, kind } = parsed.data;
  const data = await orderEmailData(orderId);
  if (!data) return { error: "Order not found." };
  if (kind === "shipped" && !data.trackingNumber) return { error: "This order has no tracking number yet." };
  const settings = await getSettings();
  const site = process.env.SITE_URL ?? "https://lppeptide.co";
  const instructions = settings.paymentMethods.find((m) => m.label === data.paymentMethod)?.instructions ?? settings.paymentInstructions;
  const ok =
    kind === "confirmation"
      ? await sendOrderConfirmation(data, instructions, settings.contact.email)
      : kind === "store"
        ? await sendNewOrderToStore(data, settings.storeInbox || settings.contact.email, `${site}/admin/orders/${orderId}/`)
        : kind === "paid"
          ? await sendPaymentConfirmed(data, settings.contact.email)
          : await sendOrderShipped(data, settings.contact.email);
  if (!ok) {
    recordEmailFailure(orderId, `${kind} (resend)`);
    revalidatePath(`/admin/orders/${orderId}/`);
    return { error: "Sending failed again. Check the SMTP settings on the server." };
  }
  return { ok: "Email sent." };
}
