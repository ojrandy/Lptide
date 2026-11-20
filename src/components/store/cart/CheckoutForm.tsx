"use client";

import Link from "next/link";
import { useActionState } from "react";
import { countryOptions } from "@/content/countries";
import { placeOrder, type CheckoutState } from "@/lib/actions/checkout";
import { formatCents } from "@/lib/money";
import type { CheckoutFields } from "@/lib/validation";
import { useCart } from "@/store/cart";
import { shippingLabel, useQuote } from "./CartView";

export const SUBMITTED_FLAG = "lp-checkout-submitted";

type Field = keyof CheckoutFields;

export function CheckoutForm({ paymentNote }: { paymentNote: string }) {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(placeOrder, {});
  const { quote, hydrated, empty } = useQuote();
  const { lines, warehouseCode, country, setCountry } = useCart();
  const countries = quote?.warehouse ? countryOptions(quote.warehouse.countries) : [];
  const v = state.values ?? {};
  const err = (f: Field) => state.fieldErrors?.[f];

  if (empty)
    return (
      <div className="cart-empty">
        <h2>Your cart is empty</h2>
        <p>Add products from the catalog to start checkout.</p>
        <Link href="/catalog/">Continue shopping</Link>
      </div>
    );
  if (!hydrated || !quote) return <div className="cart-empty"><h2>Loading your cart…</h2></div>;

  const input = (name: Field, label: string, opts: { type?: string; autoComplete?: string; required?: boolean; max?: number } = {}) => (
    <label className={`lp-field${err(name) ? " has-error" : ""}`}>
      <span>
        {label}
        {opts.required && <b aria-hidden="true"> *</b>}
      </span>
      <input
        name={name}
        type={opts.type ?? "text"}
        autoComplete={opts.autoComplete}
        required={opts.required}
        maxLength={opts.max ?? 200}
        defaultValue={v[name]}
        aria-invalid={!!err(name)}
        aria-describedby={err(name) ? `${name}-error` : undefined}
      />
      {err(name) && <small id={`${name}-error`}>{err(name)}</small>}
    </label>
  );

  const t = quote.totals;
  return (
    <section className="cart-layout" aria-label="Checkout">
      <form
        action={action}
        className="lp-checkout-card"
        onSubmit={() => {
          try {
            sessionStorage.setItem(SUBMITTED_FLAG, String(Date.now()));
          } catch {}
        }}
      >
        <input type="hidden" name="cart" value={JSON.stringify({ warehouseCode, country, lines })} />
        {/* Honeypot: hidden from people and assistive tech. */}
        <div className="lp-hp" aria-hidden="true">
          <label>
            Website <input name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
          </label>
        </div>

        <h2>Contact</h2>
        <div className="lp-field-grid">
          {input("email", "Email address", { type: "email", autoComplete: "email", required: true })}
          {input("phone", "Phone (for the carrier)", { type: "tel", autoComplete: "tel", max: 40 })}
        </div>

        <h2>Shipping address</h2>
        <p className="lp-muted">
          Ships from <strong>{quote.warehouse?.name}</strong>. Only countries this warehouse ships to are listed.
        </p>
        <div className="lp-field-grid">
          {input("name", "Full name", { autoComplete: "name", required: true, max: 120 })}
          <label className={`lp-field${err("country") ? " has-error" : ""}`}>
            <span>
              Country<b aria-hidden="true"> *</b>
            </span>
            <select
              name="country"
              required
              value={quote.countryOk ? (country ?? "") : ""}
              onChange={(e) => setCountry(e.target.value || null)}
              aria-invalid={!!err("country")}
            >
              <option value="">Choose a country</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
            {err("country") && <small>{err("country")}</small>}
          </label>
          {input("addressLine1", "Street address", { autoComplete: "address-line1", required: true })}
          {input("addressLine2", "Apartment, suite (optional)", { autoComplete: "address-line2" })}
          {input("city", "City", { autoComplete: "address-level2", required: true, max: 100 })}
          {input("region", "State / region", { autoComplete: "address-level1", max: 100 })}
          {input("postalCode", "Postal code", { autoComplete: "postal-code", max: 20 })}
        </div>
        <label className="lp-field">
          <span>Order note (optional)</span>
          <textarea name="customerNote" rows={3} maxLength={1000} defaultValue={v.customerNote} />
        </label>

        {state.error && (
          <p className="cart-unavailable-summary" role="alert">
            {state.error}
          </p>
        )}
        <p className="lp-muted">
          Research use only. By placing the order you confirm the products are not for human consumption and agree to the{" "}
          <Link href="/legal/terms/">Terms of Service</Link>. Payment instructions follow on the next page; the order is not
          treated as paid until the payment is confirmed.
        </p>
        <button className="checkout-button" type="submit" disabled={pending || !quote.canOrder}>
          {pending ? "Placing order…" : `Place order · ${formatCents(t.totalCents)}`}
        </button>
      </form>

      <aside className="cart-sidebar" aria-label="Order summary">
        <section className="summary-card">
          <h2>Order summary</h2>
          <ul className="lp-summary-lines">
            {quote.lines.map((l) => (
              <li key={l.productId}>
                <span>
                  {l.name} × {l.qty}
                </span>
                <span>{formatCents(l.lineCents)}</span>
              </li>
            ))}
          </ul>
          <dl>
            <div>
              <dt>Subtotal</dt>
              <dd>{formatCents(t.subtotalCents)}</dd>
            </div>
            <div>
              <dt>{shippingLabel(quote)}</dt>
              <dd>{quote.countryOk ? formatCents(t.shippingCents) : "Choose country"}</dd>
            </div>
            <div>
              <dt>Handling fee (5%)</dt>
              <dd>{formatCents(t.handlingCents)}</dd>
            </div>
          </dl>
          <div className="summary-total">
            <strong>Total</strong>
            <span>{formatCents(t.totalCents)}</span>
          </div>
          {t.shortCents > 0 && (
            <p className="cart-unavailable-summary" role="alert">
              You&apos;re {formatCents(t.shortCents)} short of the {formatCents(quote.minimumOrderCents)} order minimum.
            </p>
          )}
          <Link href="/cart/" className="continue-button">
            Edit cart
          </Link>
          {paymentNote && <p>{paymentNote}</p>}
        </section>
      </aside>
    </section>
  );
}
