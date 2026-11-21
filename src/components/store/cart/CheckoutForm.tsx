"use client";

import { LocaleLink as Link } from "@/i18n/client";
import { useActionState, useEffect, useState } from "react";
import { countryOptions } from "@/content/countries";
import { useI18n } from "@/i18n/client";
import { placeOrder, type CheckoutState } from "@/lib/actions/checkout";
import { formatCents } from "@/lib/money";
import type { CheckoutFields } from "@/lib/validation";
import { useCart } from "@/store/cart";
import { blockerText, shippingLabel, useQuote } from "./CartView";

export const SUBMITTED_FLAG = "lp-checkout-submitted";

type Field = keyof CheckoutFields;

export type SavedAddress = {
  id: number;
  label: string;
  name: string;
  phone: string;
  country: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  postalCode: string;
  isDefault: boolean;
};

type Props = {
  paymentNote: string;
  methods: { id: string; label: string }[];
  account: { email: string; name: string } | null;
  addresses: SavedAddress[];
};

export function CheckoutForm({ paymentNote, methods, account, addresses }: Props) {
  const { t, href, locale } = useI18n();
  const [state, action, pending] = useActionState<CheckoutState, FormData>(placeOrder, {});
  const { quote, hydrated, empty } = useQuote();
  const { lines, warehouseCode, country, setCountry } = useCart();
  const countries = quote?.warehouse ? countryOptions(quote.warehouse.countries) : [];
  // Saved addresses this warehouse can ship to; the default one (or the first) prefills the form.
  const usable = addresses.filter((a) => !quote?.warehouse || quote.warehouse.countries.includes(a.country));
  const [addressId, setAddressId] = useState<number | null>(null);
  const chosen = addressId === -1 ? null : (usable.find((a) => a.id === addressId) ?? usable.find((a) => a.isDefault) ?? usable[0] ?? null);
  const v: Partial<Record<Field | "paymentMethod", string>> = state.values ?? {
    email: account?.email,
    name: chosen?.name ?? account?.name,
    phone: chosen?.phone,
    addressLine1: chosen?.addressLine1,
    addressLine2: chosen?.addressLine2,
    city: chosen?.city,
    region: chosen?.region,
    postalCode: chosen?.postalCode,
  };
  const err = (f: Field) => state.fieldErrors?.[f];
  // The prefilled saved address also sets the delivery country (re-priced by useQuote).
  const chosenCountry = chosen?.country;
  useEffect(() => {
    if (chosenCountry && !state.values) setCountry(chosenCountry);
  }, [chosenCountry, setCountry, state.values]);

  if (empty)
    return (
      <div className="cart-empty">
        <h2>{t("cart.empty")}</h2>
        <p>{t("cart.emptyText")}</p>
        <Link href={href("/catalog/")}>{t("common.continueShopping")}</Link>
      </div>
    );
  if (!hydrated || !quote)
    return (
      <div className="cart-empty">
        <h2>{t("cart.loading")}</h2>
      </div>
    );

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

  const pickAddress = (id: number) => {
    setAddressId(id);
    const a = usable.find((x) => x.id === id);
    if (a) setCountry(a.country);
  };

  const totals = quote.totals;
  const blocker = blockerText(quote, t);
  return (
    <section className="cart-layout" aria-label={t("checkout.title")}>
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
        <input type="hidden" name="locale" value={locale} />
        {/* Honeypot: hidden from people and assistive tech. */}
        <div className="lp-hp" aria-hidden="true">
          <label>
            Website <input name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
          </label>
        </div>

        {!account && (
          <p className="lp-muted lp-signin-prompt">
            {t("checkout.signInPrompt")} <Link href={href(`/login/?next=${encodeURIComponent(href("/checkout/"))}`)}>{t("common.signIn")}</Link>
          </p>
        )}

        <h2>{t("checkout.contact")}</h2>
        <div className="lp-field-grid" key={`contact-${chosen?.id ?? 0}`}>
          {input("email", t("checkout.email"), { type: "email", autoComplete: "email", required: true })}
          {input("phone", t("checkout.phone"), { type: "tel", autoComplete: "tel", max: 40 })}
        </div>

        <h2>{t("checkout.address")}</h2>
        <p className="lp-muted">{t("checkout.shipsFromNote", { warehouse: quote.warehouse?.name ?? "" })}</p>
        {usable.length > 0 && (
          <label className="lp-field">
            <span>{t("checkout.savedAddress")}</span>
            <select value={chosen?.id ?? -1} onChange={(e) => pickAddress(Number(e.target.value))}>
              {usable.map((a) => (
                <option key={a.id} value={a.id}>
                  {[a.label, a.name, a.addressLine1, a.city, a.country].filter(Boolean).join(" · ")}
                </option>
              ))}
              <option value={-1}>{t("checkout.newAddress")}</option>
            </select>
          </label>
        )}
        {/* Remount the fields when another saved address is picked, so their default values change. */}
        <div className="lp-field-grid" key={`address-${chosen?.id ?? 0}`}>
          {input("name", t("checkout.fullName"), { autoComplete: "name", required: true, max: 120 })}
          <label className={`lp-field${err("country") ? " has-error" : ""}`}>
            <span>
              {t("checkout.country")}
              <b aria-hidden="true"> *</b>
            </span>
            <select
              name="country"
              required
              value={quote.countryOk ? (country ?? "") : ""}
              onChange={(e) => setCountry(e.target.value || null)}
              aria-invalid={!!err("country")}
            >
              <option value="">{t("checkout.chooseCountry")}</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
            {err("country") && <small>{err("country")}</small>}
          </label>
          {input("addressLine1", t("checkout.street"), { autoComplete: "address-line1", required: true })}
          {input("addressLine2", t("checkout.street2"), { autoComplete: "address-line2" })}
          {input("city", t("checkout.city"), { autoComplete: "address-level2", required: true, max: 100 })}
          {input("region", t("checkout.region"), { autoComplete: "address-level1", max: 100 })}
          {input("postalCode", t("checkout.postalCode"), { autoComplete: "postal-code", max: 20 })}
        </div>
        {account && !chosen && (
          <label className="lp-check">
            <input type="checkbox" name="saveAddress" defaultChecked /> {t("checkout.saveAddress")}
          </label>
        )}
        <label className="lp-field">
          <span>{t("checkout.note")}</span>
          <textarea name="customerNote" rows={3} maxLength={1000} defaultValue={v.customerNote} />
        </label>

        {methods.length > 0 && (
          <fieldset className="lp-payment-methods">
            <legend>{t("checkout.payment")}</legend>
            {methods.map((m, i) => (
              <label key={m.id} className="lp-check">
                <input type="radio" name="paymentMethod" value={m.id} defaultChecked={v.paymentMethod ? v.paymentMethod === m.id : i === 0} required />{" "}
                {m.label}
              </label>
            ))}
            <p className="lp-muted">{t("checkout.paymentHelp")}</p>
          </fieldset>
        )}

        {state.error && (
          <p className="cart-unavailable-summary" role="alert">
            {state.error}
          </p>
        )}
        <p className="lp-muted">
          {t("checkout.ruo")} <Link href={href("/legal/terms/")}>{t("checkout.terms")}</Link>
          {t("checkout.afterTerms")}
        </p>
        <button className="checkout-button" type="submit" disabled={pending || !quote.canOrder}>
          {pending ? t("checkout.placing") : t("checkout.place", { total: formatCents(totals.totalCents) })}
        </button>
      </form>

      <aside className="cart-sidebar" aria-label={t("cart.summary")}>
        <section className="summary-card">
          <h2>{t("cart.summary")}</h2>
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
              <dt>{t("cart.subtotal")}</dt>
              <dd>{formatCents(totals.subtotalCents)}</dd>
            </div>
            <div>
              <dt>{shippingLabel(quote, t)}</dt>
              <dd>{quote.countryOk ? formatCents(totals.shippingCents) : t("cart.chooseCountryShort")}</dd>
            </div>
            <div>
              <dt>{t("cart.handling")}</dt>
              <dd>{formatCents(totals.handlingCents)}</dd>
            </div>
          </dl>
          <div className="summary-total">
            <strong>{t("cart.total")}</strong>
            <span>{formatCents(totals.totalCents)}</span>
          </div>
          {blocker && quote.countryOk && (
            <p className="cart-unavailable-summary" role="alert">
              {blocker}
            </p>
          )}
          <Link href={href("/cart/")} className="continue-button">
            {t("checkout.editCart")}
          </Link>
          {paymentNote && <p>{paymentNote}</p>}
        </section>
      </aside>
    </section>
  );
}
