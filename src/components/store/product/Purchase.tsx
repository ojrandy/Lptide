"use client";

import { ChevronDown, Search } from "lucide-react";
import { LocaleLink as Link } from "@/i18n/client";
import { useSearchParams } from "next/navigation";
import { createContext, use, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { useI18n } from "@/i18n/client";
import { formatCents } from "@/lib/money";
import { useCart } from "@/store/cart";
import { useAddToCart } from "../AddToCart";

export type PurchaseWarehouse = {
  code: string;
  name: string;
  dispatch: string;
  countries: { code: string; name: string }[];
  price: { priceCents: number; listCents: number; inStock: boolean } | null;
};

type Ctx = {
  productId: number;
  catalogCents: number;
  warehouses: PurchaseWarehouse[];
  selected: PurchaseWarehouse | null;
  select: (code: string) => void;
  /** Opened from a warehouse page (?warehouse=): only that warehouse can be used, as on the live site. */
  locked: boolean;
  lock: (code: string) => void;
};

const PurchaseContext = createContext<Ctx | null>(null);
const usePurchase = () => use(PurchaseContext)!;

/** Holds the chosen warehouse, shared by the buy box and the mobile purchase bar. */
export function PurchaseProvider({
  productId,
  catalogCents,
  warehouses,
  children,
}: {
  productId: number;
  catalogCents: number;
  warehouses: PurchaseWarehouse[];
  children: ReactNode;
}) {
  const [code, setCode] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const cartWarehouse = useCart((s) => (s.lines.length ? s.warehouseCode : null));
  // Default to the cart's warehouse when this product is sold there (one warehouse per order).
  const selectedCode = code ?? (warehouses.some((w) => w.code === cartWarehouse && w.price) ? cartWarehouse : null);

  const value = useMemo<Ctx>(
    () => ({
      productId,
      catalogCents,
      warehouses,
      // Like live, a warehouse that doesn't sell the product can still be picked: it shows as out of stock.
      selected: warehouses.find((w) => w.code === selectedCode) ?? null,
      select: setCode,
      locked,
      lock: (c: string) => {
        setCode(c);
        setLocked(true);
      },
    }),
    [productId, catalogCents, warehouses, selectedCode, locked],
  );
  return <PurchaseContext value={value}>{children}</PurchaseContext>;
}

/** Applies ?warehouse=CNFC (links from warehouse pages). Render inside <Suspense>. */
export function WarehouseFromUrl() {
  const param = useSearchParams().get("warehouse")?.toUpperCase();
  const { warehouses, lock } = usePurchase();
  useEffect(() => {
    if (param && warehouses.some((w) => w.code === param && w.price)) lock(param);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lock is recreated with the context value
  }, [param, warehouses]);
  return null;
}

function useAdd() {
  const { productId, selected } = usePurchase();
  const add = useAddToCart();
  const { t, href } = useI18n();
  const country = useCart((s) => s.country);
  const [feedback, setFeedback] = useState<ReactNode>("");
  const countryOk = !!selected && selected.countries.some((c) => c.code === country);
  const canAdd = !!selected?.price?.inStock && countryOk;
  const onAdd = () => {
    if (!selected || !canAdd) return;
    if (add(productId, selected.code, selected.name))
      setFeedback(
        <>
          {t("product.addedFrom", { warehouse: selected.name })} <Link href={href("/cart/")}>{t("common.viewCart")}</Link>
        </>,
      );
  };
  return { canAdd, countryOk, onAdd, feedback };
}

export function BuyBox({ specification }: { specification: string }) {
  const { warehouses, selected, select, catalogCents, locked } = usePurchase();
  const { canAdd, countryOk, onAdd, feedback } = useAdd();
  const { t } = useI18n();
  const price = selected?.price;
  const shown = locked && selected ? [selected] : warehouses;

  const stockText = !selected
    ? t("product.stockChoose")
    : !price?.inStock
      ? t("product.stockOut", { warehouse: selected.name })
      : !countryOk
        ? t("product.stockCountry")
        : t("common.inStock");

  return (
    <section className="purchase-card">
      <div className="purchase-price-row">
        <strong className="price">{formatCents(price ? price.priceCents : catalogCents)}</strong>
        {price && price.listCents > price.priceCents && <del className="old-price">{formatCents(price.listCents)}</del>}
      </div>
      <p id="purchase-stock-status" className={`stock-line${price?.inStock ? "" : " out-of-stock"}`}>
        {stockText}
      </p>

      <section className="warehouse-selector" aria-labelledby="warehouse-selector-heading">
        <div className="warehouse-selector-heading">
          <div>
            <strong id="warehouse-selector-heading">{t("product.shipsFrom")}</strong>
            <span>{locked ? t("product.lockedWarehouse") : t("product.chooseWarehouse")}</span>
          </div>
        </div>
        <div className="warehouse-options" role="radiogroup" aria-label={t("product.warehouse")}>
          {shown.map((w) => (
            <label key={w.code} className={`warehouse-option${selected?.code === w.code ? " selected" : ""}${locked ? " warehouse-option-locked" : ""}`}>
              <input
                type="radio"
                name="product-warehouse"
                value={w.code}
                checked={selected?.code === w.code}
                disabled={locked}
                onChange={() => select(w.code)}
              />
              <span className="warehouse-option-copy">
                <strong>{w.name}</strong>
                <small>{w.dispatch}</small>
              </span>
              <span className={`warehouse-option-status warehouse-status-${w.price?.inStock ? "in_stock" : "out_of_stock"}`}>
                {/* Live labels anything not in stock (including "not sold here") as OUT STOCK. */}
                {w.price?.inStock ? t("common.inStock") : t("common.outStockShort")}
              </span>
            </label>
          ))}
        </div>
        {locked && selected && (
          <p className="warehouse-helper">{t("product.lockedHelp", { warehouse: selected.name })}</p>
        )}
        <CountryCombobox />
        <p className="warehouse-helper">
          {locked ? t("product.countryHelpLocked") : t("product.countryHelp")}
        </p>
      </section>

      <div className="delivery-copy">
        <strong>{t("product.specification")}</strong>
        <p>{specification}</p>
      </div>
      <button
        className={`cart-button-detail${canAdd ? "" : " is-out-of-stock"}`}
        type="button"
        disabled={!canAdd}
        aria-describedby="purchase-stock-status"
        onClick={onAdd}
      >
        {t("common.addToCart")}
      </button>
      {/* Rendered only with a message, like live: the empty paragraph's 34px min-height opens a gap above "Secure checkout". */}
      {feedback && (
        <p className="purchase-action-feedback" role="status" aria-live="polite">
          {feedback}
        </p>
      )}
      <p className="trust-copy">{t("product.secureCheckout")}</p>
    </section>
  );
}

export function MobilePurchaseBar() {
  const { selected, catalogCents } = usePurchase();
  const { canAdd, onAdd } = useAdd();
  const { t } = useI18n();
  return (
    <div className="mobile-purchase-bar" aria-label={t("product.mobileActions")}>
      <div>
        <strong>{formatCents(selected?.price ? selected.price.priceCents : catalogCents)}</strong>
      </div>
      <button type="button" className={canAdd ? undefined : "is-out-of-stock"} disabled={!canAdd} aria-describedby="purchase-stock-status" onClick={onAdd}>
        {t("common.addToCart")}
      </button>
    </div>
  );
}

/**
 * Delivery-country picker. Lists the chosen warehouse's countries (all countries before a choice).
 * Picking a country first selects the most local warehouse that ships there and sells this product.
 */
function CountryCombobox() {
  const { warehouses, selected, select } = usePurchase();
  const { t } = useI18n();
  const country = useCart((s) => s.country);
  const setCountry = useCart((s) => s.setCountry);
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState<string | null>(null);

  const options = useMemo(() => {
    const source = selected ? [selected] : warehouses.filter((w) => w.price);
    const seen = new Map<string, string>();
    for (const w of source) for (const c of w.countries) seen.set(c.code, c.name);
    return [...seen].map(([code, name]) => ({ code, name }));
  }, [selected, warehouses]);

  const current = options.find((o) => o.code === country) ?? null;
  const shown = text ?? current?.name ?? "";
  const filtered = text ? options.filter((o) => o.name.toLowerCase().includes(text.toLowerCase())) : options;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const choose = (code: string) => {
    setCountry(code);
    setText(null);
    setOpen(false);
    if (!selected) {
      const local = warehouses
        .filter((w) => w.price?.inStock && w.countries.some((c) => c.code === code))
        .sort((a, b) => a.countries.length - b.countries.length)[0];
      if (local) select(local.code);
    }
  };

  return (
    <div className="country-combobox" ref={box}>
      <label htmlFor={id}>{t("product.deliveryCountry")}</label>
      <div className="country-combobox-control">
        <Search className="country-combobox-search" size={15} aria-hidden="true" />
        <input
          id={id}
          type="text"
          autoComplete="country-name"
          role="combobox"
          aria-autocomplete="list"
          aria-controls={`${id}-listbox`}
          aria-expanded={open}
          placeholder={t("product.countryPlaceholder")}
          value={shown}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && filtered[0]) {
              e.preventDefault();
              choose(filtered[0].code);
            }
            if (e.key === "Escape") setOpen(false);
          }}
        />
        <button
          type="button"
          className="country-combobox-toggle"
          aria-label={t("product.openCountryList")}
          aria-expanded={open}
          aria-controls={`${id}-listbox`}
          onClick={() => setOpen((o) => !o)}
        >
          <ChevronDown size={16} aria-hidden="true" />
        </button>
      </div>
      {open && (
        <div id={`${id}-listbox`} className="country-combobox-list" role="listbox">
          {filtered.length === 0 && <p className="country-combobox-empty">{t("product.noCountry")}</p>}
          {filtered.map((o) => (
            <button
              key={o.code}
              type="button"
              role="option"
              aria-selected={o.code === country}
              className={o.code === country ? "selected" : undefined}
              onClick={() => choose(o.code)}
            >
              <span>
                <strong>{o.name}</strong>
                <small>{o.code}</small>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
