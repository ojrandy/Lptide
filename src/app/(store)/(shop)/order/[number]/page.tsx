import { asc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Markdown from "react-markdown";
import { Suspense } from "react";
import { ClearCartAfterOrder } from "@/components/store/cart/ClearCartAfterOrder";
import { countryName } from "@/content/countries";
import { db } from "@/db";
import { orderItems, orders, warehouses } from "@/db/schema";
import { formatCents } from "@/lib/money";
import { verifyOrderToken } from "@/lib/order-token";
import { getSettings } from "@/lib/queries/settings";
import "@/styles/live/cart.css";

// /order/{number}/?t={token} — confirmation and payment instructions. Private: the token is an HMAC of the
// order number (doc 02), the page is never cached or indexed.

export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false } };

const STATUS: Record<string, string> = {
  PENDING_PAYMENT: "Waiting for payment",
  PAID: "Payment confirmed",
  PROCESSING: "Preparing shipment",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export default function OrderPage(props: PageProps<"/order/[number]">) {
  return (
    <div className="site-shell">
      <main className="cart-page">
        <Suspense fallback={<header className="cart-heading"><h1>Loading your order…</h1></header>}>
          <OrderDetails {...props} />
        </Suspense>
      </main>
    </div>
  );
}

async function OrderDetails({ params, searchParams }: PageProps<"/order/[number]">) {
  const [{ number }, sp] = await Promise.all([params, searchParams]);
  const token = typeof sp.t === "string" ? sp.t : null;
  const upper = number.toUpperCase();
  if (!/^LP-\d{4}-[A-Z0-9]{4,8}$/.test(upper) || !verifyOrderToken(upper, token)) notFound();

  const [order] = await db
    .select({ order: orders, warehouseName: warehouses.name })
    .from(orders)
    .innerJoin(warehouses, eq(warehouses.code, orders.warehouseCode))
    .where(eq(orders.number, upper))
    .limit(1);
  if (!order) notFound();
  const o = order.order;
  const [items, settings] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, o.id)).orderBy(asc(orderItems.id)),
    getSettings(),
  ]);
  const { contact } = settings;

  return (
    <>
      <ClearCartAfterOrder />
      <nav className="cart-breadcrumb" aria-label="Breadcrumb">
        <Link href="/catalog/">Home</Link>
        <span>Order {o.number}</span>
      </nav>
      <header className="cart-heading">
        <h1>Order {o.number}</h1>
        <p>
          {o.status === "PENDING_PAYMENT"
            ? "Thank you. We have received your order. It is not treated as paid until the payment is confirmed in the order record."
            : `Status: ${STATUS[o.status] ?? o.status}.`}{" "}
          A confirmation was sent to <strong>{o.email}</strong>. Keep this page&apos;s link to check your order.
        </p>
      </header>
      <section className="cart-layout" aria-label="Order">
        <div className="cart-items">
          <p className="cart-warehouse-notice">
            <strong>Status: {STATUS[o.status] ?? o.status}</strong>
            <span>Ships from {order.warehouseName}</span>
            {o.trackingNumber && <span>Tracking: {`${o.carrier ? `${o.carrier} ` : ""}${o.trackingNumber}`}</span>}
          </p>
          {items.map((i) => (
            <article key={i.id} className="cart-item">
              <span aria-hidden="true" />
              <div className="cart-item-main">
                <div className="cart-item-title-row">
                  <h2>{i.name}</h2>
                </div>
                <p>
                  <strong>{i.sku}</strong> {i.specification}
                </p>
                <small>Quantity {i.qty}</small>
              </div>
              <div className="cart-item-price">
                <strong>{formatCents(i.lineCents)}</strong>
                <small>{formatCents(i.unitCents)} each</small>
              </div>
            </article>
          ))}
          <article className="summary-card lp-order-address">
            <h2>Ship to</h2>
            <p>
              {[o.name, o.addressLine1, o.addressLine2, [o.postalCode, o.city, o.region].filter(Boolean).join(" "), countryName(o.country), o.phone]
                .filter(Boolean)
                .map((line, n) => (
                  <span key={n}>
                    {line}
                    <br />
                  </span>
                ))}
            </p>
            {o.customerNote && (
              <p>
                <strong>Your note:</strong> {o.customerNote}
              </p>
            )}
          </article>
        </div>
        <aside className="cart-sidebar" aria-label="Order summary">
          <section className="summary-card">
            <h2>Order summary</h2>
            <dl>
              <div>
                <dt>Subtotal</dt>
                <dd>{formatCents(o.subtotalCents)}</dd>
              </div>
              <div>
                <dt>Shipping</dt>
                <dd>{formatCents(o.shippingCents)}</dd>
              </div>
              <div>
                <dt>Handling fee</dt>
                <dd>{formatCents(o.handlingCents)}</dd>
              </div>
            </dl>
            <div className="summary-total">
              <strong>Total</strong>
              <span>{formatCents(o.totalCents)}</span>
            </div>
          </section>
          {o.status === "PENDING_PAYMENT" && settings.paymentInstructions && (
            <section className="summary-card lp-payment">
              <h2>How to pay</h2>
              <Markdown>{settings.paymentInstructions}</Markdown>
              <p>
                Include your order number <strong>{o.number}</strong> with the payment.
              </p>
            </section>
          )}
          <section className="summary-card lp-payment">
            <h2>Questions?</h2>
            <p>Include your order number when you contact us.</p>
            <p>
              {contact.email && (
                <>
                  <a href={`mailto:${contact.email}?subject=${encodeURIComponent(`Order ${o.number}`)}`}>{contact.email}</a>
                  <br />
                </>
              )}
              {contact.telegram && (
                <a href={contact.telegram} target="_blank" rel="noopener noreferrer">
                  Telegram {contact.telegramAdmins.join(" ")}
                </a>
              )}
            </p>
          </section>
        </aside>
      </section>
    </>
  );
}
