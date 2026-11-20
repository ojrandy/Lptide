"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { sendNewOrderToStore, sendOrderConfirmation } from "@/lib/email";
import { orderPath } from "@/lib/order-token";
import { createOrderSync, OrderError, recordEmailFailure } from "@/lib/orders";
import { getSettings } from "@/lib/queries/settings";
import { allow, clientIp } from "@/lib/rate-limit";
import { cartInputSchema, checkoutSchema, type CheckoutFields } from "@/lib/validation";

export type CheckoutState = {
  error?: string;
  fieldErrors?: Partial<Record<keyof CheckoutFields, string>>;
  /** Echo of the submitted fields so the form keeps them after an error. */
  values?: Partial<Record<keyof CheckoutFields, string>>;
};

const FIELDS = [
  "email",
  "name",
  "phone",
  "country",
  "addressLine1",
  "addressLine2",
  "city",
  "region",
  "postalCode",
  "customerNote",
  "website",
] as const;

/**
 * Checkout (doc 02): Zod → honeypot → rate limit (5 / 10 min / IP) → server pricing, stock and country check
 * inside one transaction → emails after the response → redirect to the tokenised order page.
 */
export async function placeOrder(_prev: CheckoutState, form: FormData): Promise<CheckoutState> {
  const raw = Object.fromEntries(FIELDS.map((k) => [k, String(form.get(k) ?? "")])) as Record<(typeof FIELDS)[number], string>;
  const values = { ...raw, website: undefined };

  const fields = checkoutSchema.safeParse(raw);
  if (!fields.success) {
    const fieldErrors: CheckoutState["fieldErrors"] = {};
    for (const issue of fields.error.issues) {
      const key = issue.path[0] as keyof CheckoutFields;
      fieldErrors[key] ??= issue.message;
    }
    return { error: "Please check the highlighted fields.", fieldErrors, values };
  }
  // Honeypot filled: a bot. Answer like a normal failure without saying why.
  if (fields.data.website) return { error: "We could not place this order. Please try again.", values };

  let cart;
  try {
    cart = cartInputSchema.parse(JSON.parse(String(form.get("cart") ?? "")));
  } catch {
    return { error: "Your cart is empty or out of date. Please return to the cart.", values };
  }

  const ip = await clientIp();
  if (!allow(`checkout:${ip}`, 5, 10 * 60_000))
    return { error: "Too many orders from this connection. Please wait a few minutes and try again.", values };

  const settings = await getSettings();
  let order;
  try {
    order = createOrderSync(cart, fields.data, ip, settings.checkout);
  } catch (err) {
    if (err instanceof OrderError) return { error: err.message, values };
    console.error("[checkout] order failed", err);
    return { error: "We could not place this order. Please try again or contact support.", values };
  }

  const site = process.env.SITE_URL ?? "https://lppeptide.com";
  const f = fields.data;
  const { quote } = order;
  const data = {
    number: order.number,
    email: f.email,
    name: f.name,
    phone: f.phone,
    country: f.country,
    addressLine1: f.addressLine1,
    addressLine2: f.addressLine2,
    city: f.city,
    region: f.region,
    postalCode: f.postalCode,
    customerNote: f.customerNote,
    warehouseName: quote.warehouse!.name,
    items: quote.lines,
    ...quote.totals,
    orderUrl: `${site}${orderPath(order.number)}`,
  };
  // Emails go out after the response; a mail failure never loses the order (doc 02).
  after(async () => {
    if (!(await sendNewOrderToStore(data, settings.storeInbox || settings.contact.email, `${site}/admin/orders/${order.id}/`)))
      recordEmailFailure(order.id, "store notification");
    if (!(await sendOrderConfirmation(data, settings.paymentInstructions, settings.contact.email)))
      recordEmailFailure(order.id, "customer confirmation");
  });

  redirect(orderPath(order.number));
}
