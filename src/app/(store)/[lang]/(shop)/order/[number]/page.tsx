import { asc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { LocaleLink as Link } from "@/i18n/client";
import { notFound } from "next/navigation";
import Markdown from "react-markdown";
import { Suspense } from "react";
import { ClearCartAfterOrder } from "@/components/store/cart/ClearCartAfterOrder";
import { countryName } from "@/content/countries";
import { db } from "@/db";
import { orderItems, orders, warehouses } from "@/db/schema";
import { getI18n } from "@/i18n/server";
import type { MessageKey } from "@/i18n/translate";
import { formatCents } from "@/lib/money";
import { verifyOrderToken } from "@/lib/order-token";
import { getSettings } from "@/lib/queries/settings";
import { trackingUrl } from "@/lib/settings-schema";
import "@/styles/live/cart.css";

// /order/{number}/?t={token} — confirmation and payment instructions. Private: the token is an HMAC of the
// order number (doc 02), the page is never cached or indexed.

export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false } };

export default async function OrderPage(props: PageProps<"/[lang]/order/[number]">) {
  const { t } = await getI18n();
  return (
    <div className="site-shell">
      <main className="cart-page">
        <Suspense
          fallback={
            <header className="cart-heading">
              <h1>{t("order.loading")}</h1>
            </header>
          }
        >
          <OrderDetails {...props} />
        </Suspense>
      </main>
    </div>
  );
}

async function OrderDetails({ params, searchParams }: PageProps<"/[lang]/order/[number]">) {
  const [{ number }, sp, { t, href }] = await Promise.all([params, searchParams, getI18n()]);
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
  const status = t(`order.s.${o.status}` as MessageKey);
  // Instructions of the method chosen at checkout (by label snapshot); v1 orders fall back to the general text.
  const method = settings.paymentMethods.find((m) => m.label === o.paymentMethod);
  const instructions = method?.instructions ?? (o.paymentMethod ? "" : settings.paymentInstructions);
  const reference = o.paymentRef ?? o.number;

  return (
    <>
      <ClearCartAfterOrder />
      <nav className="cart-breadcrumb" aria-label={t("checkout.breadcrumb")}>
        <Link href={href("/catalog/")}>{t("common.home")}</Link>
        <span>{t("order.title", { number: o.number })}</span>
      </nav>
      <header className="cart-heading">
        <h1>{t("order.title", { number: o.number })}</h1>
        <p>
          {o.status === "PENDING_PAYMENT" ? t("order.thanks") : t("order.status", { status })}{" "}
          {t("order.confirmationSent", { email: o.email })}
        </p>
      </header>
      <section className="cart-layout" aria-label={t("order.title", { number: o.number })}>
        <div className="cart-items">
          <p className="cart-warehouse-notice">
            <strong>{t("order.statusLabel", { status })}</strong>
            <span>{t("order.shipsFrom", { warehouse: order.warehouseName })}</span>
            {o.trackingNumber && (
              <span>
                {t("order.tracking", { tracking: `${o.carrier ? `${o.carrier} ` : ""}${o.trackingNumber}` })} ·{" "}
                <a href={trackingUrl(settings.carriers, o.carrier, o.trackingNumber)} target="_blank" rel="noopener noreferrer">
                  {t("order.trackPackage")}
                </a>
              </span>
            )}
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
                <small>{t("order.quantity", { qty: i.qty })}</small>
              </div>
              <div className="cart-item-price">
                <strong>{formatCents(i.lineCents)}</strong>
                <small>{t("cart.each", { price: formatCents(i.unitCents) })}</small>
              </div>
            </article>
          ))}
          <article className="summary-card lp-order-address">
            <h2>{t("order.shipTo")}</h2>
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
                <strong>{t("order.yourNote")}</strong> {o.customerNote}
              </p>
            )}
          </article>
        </div>
        <aside className="cart-sidebar" aria-label={t("cart.summary")}>
          <section className="summary-card">
            <h2>{t("cart.summary")}</h2>
            <dl>
              <div>
                <dt>{t("cart.subtotal")}</dt>
                <dd>{formatCents(o.subtotalCents)}</dd>
              </div>
              <div>
                <dt>{t("cart.shipping")}</dt>
                <dd>{formatCents(o.shippingCents)}</dd>
              </div>
              <div>
                <dt>{t("cart.handlingShort")}</dt>
                <dd>{formatCents(o.handlingCents)}</dd>
              </div>
            </dl>
            <div className="summary-total">
              <strong>{t("cart.total")}</strong>
              <span>{formatCents(o.totalCents)}</span>
            </div>
          </section>
          {o.status === "PENDING_PAYMENT" && (
            <section className="summary-card lp-payment">
              <h2>{t("order.howToPay")}</h2>
              {o.paymentMethod && <p>{t("order.payWith", { method: o.paymentMethod })}</p>}
              <p className="lp-payment-ref">
                <span>{t("order.paymentRef")}</span>
                <strong>{reference}</strong>
              </p>
              <p>{t("order.includeRef")}</p>
              {instructions && <Markdown>{instructions}</Markdown>}
            </section>
          )}
          <section className="summary-card lp-payment">
            <h2>{t("order.questions")}</h2>
            <p>{t("order.includeNumber")}</p>
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
              {contact.telegram && contact.whatsapp && <br />}
              {contact.whatsapp && (
                <a href={contact.whatsapp} target="_blank" rel="noopener noreferrer">
                  WhatsApp
                </a>
              )}
            </p>
          </section>
        </aside>
      </section>
    </>
  );
}
