"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { countryOptions } from "@/content/countries";
import { getCartQuote } from "@/lib/actions/cart";
import { formatCents } from "@/lib/money";
import type { Quote } from "@/lib/orders";
import { productHref } from "@/lib/product-utils";
import { cartCount, MAX_QTY, useCart } from "@/store/cart";
import { useCartHydrated } from "../cart-widgets";

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

export function shippingLabel(quote: Quote | null) {
  if (!quote?.warehouse || !quote.countryOk || !quote.country) return "Shipping";
  // Live: local warehouses show "Local Warehouse shipping", the Asia warehouse "{Country} · Air Freight".
  return quote.warehouse.countries.length <= 1 ? "Local Warehouse shipping" : `${countryOptions([quote.country])[0].name} · Air Freight`;
}

export function CartView({ paymentNote }: { paymentNote: string }) {
  const router = useRouter();
  const { hydrated, quote, pending, empty } = useQuote();
  const { setQty, remove, country, setCountry, lines } = useCart();
  const count = cartCount(lines);
  const countries = quote?.warehouse ? countryOptions(quote.warehouse.countries) : [];
  const totals = quote?.totals;
  const minimum = quote?.minimumOrderCents ?? 0;
  const progress = minimum > 0 && totals ? Math.min(100, Math.round((totals.totalCents / minimum) * 100)) : 100;
  const problems = quote?.lines.filter((l) => l.problem) ?? [];

  const blocker = !quote
    ? null
    : problems.length > 0
      ? "Remove unavailable items to continue."
      : !quote.countryOk
        ? "Choose a delivery country served by this warehouse."
        : totals!.shortCents > 0
          ? `You're ${formatCents(totals!.shortCents)} short of the ${formatCents(minimum)} order minimum.`
          : null;

  return (
    <>
      <header className="cart-heading">
        <h1>Your cart</h1>
        <p>LPPEPTIDE cart contains {hydrated ? count : 0} items. </p>
      </header>
      <div className="cart-alert">
        <span aria-hidden="true">/</span>Cart is private to this browser. Prices and stock are checked again at checkout.
      </div>
      <section className="cart-layout" aria-label="Shopping cart">
        <div className="cart-items">
          {(empty || !hydrated) && (
            <div className="cart-empty">
              <h2>{hydrated ? "Your cart is empty" : "Loading your cart…"}</h2>
              {hydrated && (
                <>
                  <p>Add products from the catalog to start checkout.</p>
                  <Link href="/catalog/">Continue shopping</Link>
                </>
              )}
            </div>
          )}
          {quote?.warehouse && (
            <p className="cart-warehouse-notice">
              <strong>Ships from {quote.warehouse.name}</strong>
              <span>One order ships from one warehouse. To order from another warehouse, place a separate order.</span>
            </p>
          )}
          {quote?.lines.map((l) => (
            <article key={l.productId} className={`cart-item${l.problem ? " cart-item-unavailable" : ""}`}>
              <Link href={productHref(l.slug)} aria-label={l.name}>
                {l.image ? <Image src={l.image} alt="" width={128} height={128} sizes="64px" /> : <span />}
              </Link>
              <div className="cart-item-main">
                <div className="cart-item-title-row">
                  <h2>
                    <Link href={productHref(l.slug)}>{l.name}</Link>
                  </h2>
                </div>
                <p>
                  <strong>{l.sku}</strong> {l.specification}
                  {!l.problem && <span>In stock</span>}
                </p>
                {l.problem && (
                  <small className="cart-unavailable-message">
                    {l.problem === "out_of_stock" ? "Out of stock at this warehouse." : "No longer sold from this warehouse."}
                  </small>
                )}
                <div className="quantity-control">
                  <button type="button" aria-label={`Decrease ${l.name}`} onClick={() => setQty(l.productId, l.qty - 1)} disabled={l.qty <= 1}>
                    −
                  </button>
                  <input
                    className="quantity-input"
                    type="number"
                    min={1}
                    max={MAX_QTY}
                    value={l.qty}
                    aria-label={`Quantity of ${l.name}`}
                    onChange={(e) => setQty(l.productId, Number(e.target.value))}
                  />
                  <button type="button" aria-label={`Increase ${l.name}`} onClick={() => setQty(l.productId, l.qty + 1)} disabled={l.qty >= MAX_QTY}>
                    +
                  </button>
                  <button type="button" className="remove-cart-item" onClick={() => remove(l.productId)}>
                    Remove
                  </button>
                </div>
              </div>
              <div className="cart-item-price">
                <strong>{formatCents(l.lineCents)}</strong>
                {l.listCents > l.unitCents && <del className="cart-item-original-price">{formatCents(l.listCents * l.qty)}</del>}
                <small>{formatCents(l.unitCents)} each</small>
              </div>
            </article>
          ))}
        </div>

        <aside className="cart-sidebar" aria-label="Order summary">
          <section className="summary-card" aria-busy={pending}>
            <h2>Order summary</h2>
            {countries.length > 0 && (
              <label className="lp-field">
                <span>Delivery country</span>
                <select value={quote?.countryOk ? (country ?? "") : ""} onChange={(e) => setCountry(e.target.value || null)}>
                  <option value="">Choose a country</option>
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <dl>
              <div>
                <dt>Subtotal ({count} items)</dt>
                <dd>{formatCents(totals?.subtotalCents ?? 0)}</dd>
              </div>
              <div>
                <dt>{shippingLabel(quote)}</dt>
                <dd>{quote?.countryOk ? formatCents(totals?.shippingCents ?? 0) : "Choose country"}</dd>
              </div>
              <div>
                <dt>Handling fee (5%)</dt>
                <dd>{formatCents(totals?.handlingCents ?? 0)}</dd>
              </div>
            </dl>
            <div className="summary-total">
              <strong>Total</strong>
              <span>{formatCents(totals?.totalCents ?? 0)}</span>
            </div>
            {minimum > 0 && (
              <section className={`minimum-order-status${totals && totals.shortCents === 0 ? " is-satisfied" : ""}`} aria-live="polite">
                <div className="minimum-order-status-copy">
                  <strong>{formatCents(minimum)} order minimum</strong>
                  <span>
                    {totals && totals.shortCents === 0
                      ? "Minimum reached."
                      : `You're ${formatCents(totals?.shortCents ?? minimum)} short. Shipping counts toward the minimum.`}
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
            <button className="checkout-button" type="button" disabled={!quote?.canOrder || pending} onClick={() => router.push("/checkout/")}>
              Proceed to Checkout
            </button>
            <Link href="/catalog/" className="continue-button">
              Continue shopping
            </Link>
            <Link href="/contact/" className="cart-support-button">
              Contact support
            </Link>
            {paymentNote && <p>{paymentNote}</p>}
          </section>
        </aside>
      </section>
    </>
  );
}
