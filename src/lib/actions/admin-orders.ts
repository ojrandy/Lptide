"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sqlite } from "@/db";
import { ORDER_STATUSES, type OrderStatus } from "@/db/schema";
import { orderEmailData, TRANSITIONS } from "@/lib/admin/orders";
import { requireAdmin } from "@/lib/auth";
import { sendNewOrderToStore, sendOrderConfirmation, sendOrderShipped } from "@/lib/email";
import { recordEmailFailure } from "@/lib/orders";
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

/** Moves an order along the state machine (doc 04). SHIPPED needs carrier + tracking and emails the customer. */
export async function updateOrderStatus(_prev: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = statusSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the fields." };
  const { orderId, to, carrier, trackingNumber, note } = parsed.data;
  if (to === "SHIPPED" && (!carrier || !trackingNumber)) return { error: "Shipping needs the carrier and the tracking number." };

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
    else sqlite.prepare("UPDATE orders SET status = ?, updatedAt = ? WHERE id = ?").run(to, now, orderId);
    sqlite
      .prepare("INSERT INTO order_events (orderId, fromStatus, toStatus, note, adminId, createdAt) VALUES (?, ?, ?, ?, ?, ?)")
      .run(orderId, row.status, to, note, admin.id, now);
    sqlite.exec("COMMIT");
  } catch (err) {
    sqlite.exec("ROLLBACK");
    return { error: err instanceof Error ? err.message : "Could not update the order." };
  }

  let message = `Order marked ${to.replace("_", " ").toLowerCase()}.`;
  if (to === "SHIPPED") {
    const data = await orderEmailData(orderId);
    const { contact } = await getSettings();
    if (data && (await sendOrderShipped(data, contact.email))) message += " Shipped email sent to the customer.";
    else {
      recordEmailFailure(orderId, "shipped notification");
      message += " The shipped email failed: use Resend below.";
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
  kind: z.enum(["confirmation", "store", "shipped"]),
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
  const site = process.env.SITE_URL ?? "https://lppeptide.com";
  const ok =
    kind === "confirmation"
      ? await sendOrderConfirmation(data, settings.paymentInstructions, settings.contact.email)
      : kind === "store"
        ? await sendNewOrderToStore(data, settings.storeInbox || settings.contact.email, `${site}/admin/orders/${orderId}/`)
        : await sendOrderShipped(data, settings.contact.email);
  if (!ok) {
    recordEmailFailure(orderId, `${kind} (resend)`);
    revalidatePath(`/admin/orders/${orderId}/`);
    return { error: "Sending failed again. Check the SMTP settings on the server." };
  }
  return { ok: "Email sent." };
}
