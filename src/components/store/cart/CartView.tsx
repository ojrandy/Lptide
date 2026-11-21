"use client";

import Image from "next/image";
import { LocaleLink as Link } from "@/i18n/client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { countryOptions } from "@/content/countries";
import { useI18n } from "@/i18n/client";
import type { T } from "@/i18n/translate";
import { getCartQuote } from "@/lib/actions/cart";
import { formatCents } from "@/lib/money";
import type { Quote, QuoteLine } from "@/lib/orders";
import { productHref } from "@/lib/product-utils";
import { cartCount, MAX_QTY, useCart } from "@/store/cart";
import { signedInHint, useCartHydrated } from "../cart-widgets";

// Cart page body (live classes: cart-*). The cart holds ids and quantities; everything shown here comes from
// a server quote (current prices, stock, shipping rule, handling fee, minimum).

/** Re-quotes whenever the cart or delivery country changes. */
export function useQuote() {
  const hydrated = useCartHydrated();
  const { lines, warehouseCode, country } = useCart();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [pending, start] = useTransition();
  const key = JSON.stringify([warehouseCode, country, lines]);

  useEffect(() => {
    if (!hydrated || !warehouseCode || lines.length === 0) return;
    start(async () => setQuote(await getCartQuote({ warehouseCode, country, lines })));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key covers lines/country/warehouse
  }, [hydrated, key]);

  const empty = hydrated && lines.length === 0;
  return { hydrated, quote: empty ? null : quote, pending, empty };
}

export function shippingLabel(quote: Quote | null, t: T) {
  if (!quote?.warehouse || !quote.countryOk || !quote.country) return t("cart.shipping");
  // Live: local warehouses show "Local Warehouse shipping", the Asia warehouse "{Country} · Air Freight".
  return quote.warehouse.countries.length <= 1 ? t("cart.localShipping") : t("cart.airFreight", { country: countryOptions([quote.country])[0].name });
}

export function problemText(l: QuoteLine, t: T) {
  if (l.problem === "out_of_stock") return t("cart.outAtWarehouse");
  if (l.problem === "not_enough_stock") return t("cart.notEnough", { count: l.stockQty ?? 0 });
  return t("cart.notSold");
}

/** Why the cart cannot be ordered yet (null when it can). */
export function blockerText(quote: Quote | null, t: T) {
  if (!quote) return null;
  const totals = quote.totals;
  if (quote.lines.some((l) => l.problem)) return t("cart.removeUnavailable");
  if (!quote.countryOk) return t("cart.countryNotServed");
  if (totals.noShippingRule) return t("cart.noShipping");
  if (totals.shortCents > 0) return t("cart.shortOfMinimum", { short: formatCents(totals.shortCents), minimum: formatCents(quote.minimumOrderCents) });
  return null;
}

const noop = () => () => {};

/** "Cart is private to this browser. {signIn} to sync across devices." with the placeholder as a link (live copy). */
function PrivateNote({ text, signIn, href }: { text: string; signIn: string; href: string }) {
  const [before, after = ""] = text.split("{signIn}");
  return (
    <>
      {before}
      <Link href={href}>{signIn}</Link>
      {after}
    </>
  );
}

export function CartView({ paymentNote, minimumOrderCents }: { paymentNote: string; minimumOrderCents: number }) {
  const router = useRouter();
  const { t, href } = useI18n();
  const { hydrated, quote, pending, empty } = useQuote();
  const { setQty, remove, country, setCountry, lines } = useCart();
  const signedIn = useSyncExternalStore(noop, signedInHint, () => false);
  const count = cartCount(lines);
  const countries = quote?.warehouse ? countryOptions(quote.warehouse.countries) : [];
  const totals = quote?.totals;
  // Live shows the minimum box (and the "short" message) even for an empty cart, so fall back to the store setting.
  const minimum = quote?.minimumOrderCents ?? minimumOrderCents;
  const progress = minimum > 0 ? Math.min(100, Math.round(((totals?.totalCents ?? 0) / minimum) * 100)) : 100;
  // Live splits the subtotal into original price, reduction and current subtotal whenever items are on sale.
  const subtotal = totals?.subtotalCents ?? 0;
  // Same lines as the server subtotal (src/lib/orders.ts): unavailable or out-of-stock lines are not counted.
  const reduction = (quote?.lines.reduce((sum, l) => sum + (l.problem ? 0 : l.listCents * l.qty), 0) ?? 0) - subtotal;
  const blocker =
    empty && minimum > 0
      ? t("cart.shortOfMinimum", { short: formatCents(minimum), minimum: formatCents(minimum) })
      : blockerText(quote, t);

  return (
    <>
      <header className="cart-heading">
        <h1>{t("cart.title")}</h1>
        <p>{t("cart.contains", { count: hydrated ? count : 0 })}</p>
      </header>
      <div className="cart-alert">
        <span aria-hidden="true">/</span>
        {signedIn ? t("cart.privateNoteAccount") : <PrivateNote text={t("cart.privateNote")} signIn={t("common.signIn")} href={href("/login/")} />}
      </div>
      <section className="cart-layout" aria-label={t("common.shoppingCart")}>
        <div className="cart-items">
          {(empty || !hydrated) && (
            <div className="cart-empty">
              <h2>{hydrated ? t("cart.empty") : t("cart.loading")}</h2>
              {hydrated && (
                <>
                  <p>{t("cart.emptyText")}</p>
                  <Link href={href("/catalog/")}>{t("common.continueShopping")}</Link>
                </>
              )}
            </div>
          )}
          {quote?.warehouse && (
            <p className="cart-warehouse-notice">
              <strong>{t("cart.shipsFrom", { warehouse: quote.warehouse.name })}</strong>
              <span>{t("cart.oneWarehouse")}</span>
            </p>
          )}
          {quote?.lines.map((l) => (
            <article key={l.productId} className={`cart-item${l.problem ? " cart-item-unavailable" : ""}`}>
              <Link href={href(productHref(l.slug))} aria-label={l.name}>
                {l.image ? <Image src={l.image} alt="" width={128} height={128} sizes="64px" /> : <span />}
              </Link>
              <div className="cart-item-main">
                <div className="cart-item-title-row">
                  <h2>
                    <Link href={href(productHref(l.slug))}>{l.name}</Link>
                  </h2>
                </div>
                <p>
                  <strong>{l.sku}</strong> {l.specification}
                  {!l.problem && <span>{t("common.inStock")}</span>}
                </p>
                {l.problem && <small className="cart-unavailable-message">{problemText(l, t)}</small>}
                <div className="quantity-control">
                  <button type="button" aria-label={t("cart.decrease", { name: l.name })} onClick={() => setQty(l.productId, l.qty - 1)} disabled={l.qty <= 1}>
                    −
                  </button>
                  <input
                    className="quantity-input"
                    type="number"
                    min={1}
                    max={MAX_QTY}
                    value={l.qty}
                    aria-label={t("cart.quantityOf", { name: l.name })}
                    onChange={(e) => setQty(l.productId, Number(e.target.value))}
                  />
                  <button type="button" aria-label={t("cart.increase", { name: l.name })} onClick={() => setQty(l.productId, l.qty + 1)} disabled={l.qty >= MAX_QTY}>
                    +
                  </button>
                  <button type="button" className="remove-cart-item" onClick={() => remove(l.productId)}>
                    {t("cart.remove")}
                  </button>
                </div>
              </div>
              <div className="cart-item-price">
                <strong>{formatCents(l.lineCents)}</strong>
                {l.listCents > l.unitCents && <del className="cart-item-original-price">{formatCents(l.listCents * l.qty)}</del>}
                <small>{t("cart.each", { price: formatCents(l.unitCents) })}</small>
              </div>
            </article>
          ))}
        </div>

        <aside className="cart-sidebar" aria-label={t("cart.summary")}>
          <section className="summary-card" aria-busy={pending}>
            <h2>{t("cart.summary")}</h2>
            {countries.length > 0 && (
              <label className="lp-field">
                <span>{t("cart.deliveryCountry")}</span>
                <select value={quote?.countryOk ? (country ?? "") : ""} onChange={(e) => setCountry(e.target.value || null)}>
                  <option value="">{t("cart.chooseCountry")}</option>
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <dl>
              {reduction > 0 ? (
                <>
                  <div>
                    <dt>{t("cart.originalTotal", { count, items: count === 1 ? t("cart.item") : t("cart.items") })}</dt>
                    <dd>{formatCents(subtotal + reduction)}</dd>
                  </div>
                  <div className="summary-compare-at-row">
                    <dt>{t("cart.reduction")}</dt>
                    <dd>-{formatCents(reduction)}</dd>
                  </div>
                  <div>
                    <dt>{t("cart.currentSubtotal")}</dt>
                    <dd>{formatCents(subtotal)}</dd>
                  </div>
                </>
              ) : (
                <div>
                  <dt>{t("cart.subtotalItems", { count })}</dt>
                  <dd>{formatCents(subtotal)}</dd>
                </div>
              )}
              <div>
                <dt>{shippingLabel(quote, t)}</dt>
                <dd>{empty || quote?.countryOk ? formatCents(totals?.shippingCents ?? 0) : t("cart.chooseCountryShort")}</dd>
              </div>
              <div>
                <dt>{t("cart.handling")}</dt>
                <dd>{formatCents(totals?.handlingCents ?? 0)}</dd>
              </div>
            </dl>
            <div className="summary-total">
              <strong>{t("cart.total")}</strong>
              <span>{formatCents(totals?.totalCents ?? 0)}</span>
            </div>
            {minimum > 0 && (
              <section className={`minimum-order-status${totals && totals.shortCents === 0 ? " is-satisfied" : ""}`} aria-live="polite">
                <div className="minimum-order-status-copy">
                  <strong>{t("cart.minimum", { amount: formatCents(minimum) })}</strong>
                  <span>
                    {totals && totals.shortCents === 0
                      ? t("cart.minimumReached")
                      : t("cart.minimumShort", { amount: formatCents(totals?.shortCents ?? minimum) })}
                  </span>
                </div>
                <div className="minimum-order-progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                  <span style={{ width: `${progress}%` }} />
                </div>
              </section>
            )}
            {blocker && (
              <p className="cart-unavailable-summary" role="alert">
                {blocker}
              </p>
            )}
            <button className="checkout-button" type="button" disabled={!quote?.canOrder || pending} onClick={() => router.push(href("/checkout/"))}>
              {t("cart.checkout")}
            </button>
            <Link href={href("/catalog/")} className="continue-button">
              {t("common.continueShopping")}
            </Link>
            <Link href={href("/contact/")} className="cart-support-button">
              {t("common.contactSupport")}
            </Link>
            {paymentNote && <p>{paymentNote}</p>}
          </section>
        </aside>
      </section>
    </>
  );
}
