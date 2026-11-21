"use client";

import { ShoppingCart, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useI18n } from "@/i18n/client";
import { formatCents } from "@/lib/money";
import { useCart } from "@/store/cart";

export type PickWarehouse = { code: string; name: string; tagline: string };
export type PickPrice = { warehouseCode: string; priceCents: number; listCents: number; inStock: boolean };

/**
 * Adds to the cart for one warehouse. The cart holds one warehouse at a time (doc 02, D3): if it holds another
 * warehouse's items, ask before replacing them. Returns true when the product is in the cart.
 */
export function useAddToCart() {
  const cart = useCart();
  const { t } = useI18n();
  return (productId: number, warehouseCode: string, warehouseName: string, qty = 1) => {
    if (cart.add(productId, warehouseCode, qty)) return true;
    const ok = window.confirm(t("card.replaceCart", { warehouse: warehouseName }));
    if (ok) cart.switchWarehouse(productId, warehouseCode, qty);
    return ok;
  };
}

/** Warehouse page card button: the warehouse is fixed by the page. */
export function WarehouseAddButton({
  productId,
  warehouse,
  inStock,
}: {
  productId: number;
  warehouse: PickWarehouse;
  inStock: boolean;
}) {
  const add = useAddToCart();
  const { t } = useI18n();
  const [feedback, setFeedback] = useState("");

  return (
    <>
      <button
        className="warehouse-add-button"
        type="button"
        disabled={!inStock}
        onClick={() => setFeedback(add(productId, warehouse.code, warehouse.name) ? t("card.added") : "")}
      >
        <ShoppingCart size={16} aria-hidden="true" />
        <span>{inStock ? t("common.addToCartLower") : t("common.outStockShort")}</span>
      </button>
      <p className="warehouse-cart-feedback" role="status" aria-live="polite">
        {feedback}
      </p>
    </>
  );
}

/**
 * Catalog/category buttons ("Add to Cart" / "Buy Now"). The product may ship from several warehouses:
 * use the cart's warehouse if it can, the only in-stock warehouse if there is one, otherwise ask.
 */
export function ChooseWarehouseButtons({
  productId,
  productName,
  prices,
  warehouses,
  classNames = {},
}: {
  productId: number;
  productName: string;
  prices: PickPrice[];
  warehouses: PickWarehouse[];
  /** wrapper: div around the two buttons (the feedback line follows it, as on the live cards). */
  classNames?: { wrapper?: string; primary?: string; secondary?: string };
}) {
  const router = useRouter();
  const { t, href } = useI18n();
  const add = useAddToCart();
  const cartWarehouse = useCart((s) => (s.lines.length ? s.warehouseCode : null));
  const dialog = useRef<HTMLDialogElement>(null);
  const [then, setThen] = useState<"stay" | "cart">("stay");
  const [feedback, setFeedback] = useState("");

  const available = warehouses
    .map((w) => ({ w, p: prices.find((x) => x.warehouseCode === w.code) }))
    .filter((x): x is { w: PickWarehouse; p: PickPrice } => !!x.p);
  const inStock = available.filter((x) => x.p.inStock);

  const finish = (code: string, next: "stay" | "cart") => {
    const w = warehouses.find((x) => x.code === code)!;
    if (!add(productId, code, w.name)) return;
    dialog.current?.close();
    if (next === "cart") router.push(href("/cart/"));
    else setFeedback(t("card.addedFrom", { warehouse: w.name }));
  };

  const start = (next: "stay" | "cart") => {
    const preferred = inStock.find((x) => x.w.code === cartWarehouse) ?? (inStock.length === 1 ? inStock[0] : null);
    if (preferred) return finish(preferred.w.code, next);
    setThen(next);
    dialog.current?.showModal();
  };

  const disabled = inStock.length === 0;
  return (
    <>
      <div className={classNames.wrapper}>
        <button className={classNames.primary} type="button" disabled={disabled} onClick={() => start("stay")}>
          {disabled ? t("common.outStockShort") : t("common.addToCart")}
        </button>
        <button className={classNames.secondary} type="button" disabled={disabled} onClick={() => start("cart")}>
          {t("common.buyNow")}
        </button>
      </div>
      <p className="purchase-action-feedback" role="status" aria-live="polite">
        {feedback}
      </p>
      <dialog
        ref={dialog}
        className="storefront-context-search lp-warehouse-picker"
        aria-labelledby={`pick-${productId}`}
        onClick={(e) => e.target === dialog.current && dialog.current.close()}
      >
        <div>
          <button type="button" aria-label={t("common.close")} onClick={() => dialog.current?.close()}>
            <X size={20} aria-hidden="true" />
          </button>
          <h2 id={`pick-${productId}`}>{t("card.chooseWarehouse")}</h2>
          <p>{t("card.chooseWarehouseText", { name: productName })}</p>
          <div className="lp-warehouse-picker-options">
            {available.map(({ w, p }) => (
              <button key={w.code} type="button" disabled={!p.inStock} onClick={() => finish(w.code, then)}>
                <span>
                  <strong>{w.name}</strong>
                  <small>{w.tagline}</small>
                </span>
                <span>
                  <strong>{formatCents(p.priceCents)}</strong>
                  <small>{p.inStock ? t("common.inStock") : t("common.outStockShort")}</small>
                </span>
              </button>
            ))}
          </div>
        </div>
      </dialog>
    </>
  );
}
