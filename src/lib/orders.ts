import { randomInt } from "node:crypto";
import { sqlite } from "@/db";
import type { ShippingRule } from "@/db/schema";
import { getSettings } from "@/lib/queries/settings";
import { orderTotals, type Totals } from "./pricing";
import type { CartInput, CheckoutFields } from "./validation";

// Cart pricing and order creation. Synchronous on the raw node:sqlite handle (doc 03): a synchronous
// BEGIN … COMMIT cannot interleave with other requests, so stock/price checks and inserts are atomic.
// Client prices are never read: every amount comes from product_prices for the cart's warehouse (doc 04).

export type QuoteLine = {
  productId: number;
  slug: string;
  name: string;
  sku: string;
  specification: string;
  image: string | null;
  qty: number;
  unitCents: number;
  listCents: number;
  lineCents: number;
  /** null when the line can be ordered. */
  problem: null | "unavailable" | "out_of_stock";
};

export type Quote = {
  warehouse: { code: string; name: string; countries: string[] } | null;
  country: string | null;
  countryOk: boolean;
  lines: QuoteLine[];
  totals: Totals;
  minimumOrderCents: number;
  /** True when every line is orderable, the country is served and the minimum is met. */
  canOrder: boolean;
};

type CheckoutRules = { handlingPercent: number; minimumOrderCents: number };

const warehouseStmt = () =>
  sqlite.prepare("SELECT code, name, countries, shippingRule, active FROM warehouses WHERE code = ?");
const linesStmt = (n: number) =>
  sqlite.prepare(
    `SELECT p.id, p.slug, p.name, p.sku, p.specification, p.images, p.weightKg, p.enabled,
            pp.priceCents, pp.listCents, pp.inStock
       FROM products p
       LEFT JOIN product_prices pp ON pp.productId = p.id AND pp.warehouseCode = ?
      WHERE p.id IN (${Array(n).fill("?").join(",")})`,
  );

type Row = {
  id: number;
  slug: string;
  name: string;
  sku: string;
  specification: string;
  images: string;
  weightKg: number | null;
  enabled: number;
  priceCents: number | null;
  listCents: number | null;
  inStock: number | null;
};

/** Prices a cart from the database. Sync: safe to call inside a transaction. */
export function priceCartSync(input: CartInput, rules: CheckoutRules): Quote {
  const wh = warehouseStmt().get(input.warehouseCode) as
    | { code: string; name: string; countries: string; shippingRule: string | null; active: number }
    | undefined;
  const warehouse = wh && wh.active ? { code: wh.code, name: wh.name, countries: JSON.parse(wh.countries) as string[] } : null;
  const rule = wh?.shippingRule ? (JSON.parse(wh.shippingRule) as ShippingRule) : null;

  // Merge duplicate product lines.
  const qty = new Map<number, number>();
  for (const l of input.lines) qty.set(l.productId, Math.min(99, (qty.get(l.productId) ?? 0) + l.qty));
  const ids = [...qty.keys()];
  const rows = new Map(
    (linesStmt(ids.length).all(input.warehouseCode, ...ids) as Row[]).map((r) => [r.id, r]),
  );

  const lines: QuoteLine[] = [];
  const weights: { unitCents: number; qty: number; weightKg: number | null }[] = [];
  for (const id of ids) {
    const r = rows.get(id);
    if (!r) continue; // deleted product: silently dropped
    const q = qty.get(id)!;
    const problem: QuoteLine["problem"] =
      !warehouse || !r.enabled || r.priceCents == null ? "unavailable" : !r.inStock ? "out_of_stock" : null;
    const unitCents = r.priceCents ?? 0;
    lines.push({
      productId: r.id,
      slug: r.slug,
      name: r.name,
      sku: r.sku,
      specification: r.specification,
      image: (JSON.parse(r.images) as string[])[0] ?? null,
      qty: q,
      unitCents,
      listCents: r.listCents ?? unitCents,
      lineCents: unitCents * q,
      problem,
    });
    if (!problem) weights.push({ unitCents, qty: q, weightKg: r.weightKg });
  }

  const countryOk = !!warehouse && !!input.country && warehouse.countries.includes(input.country);
  const totals = orderTotals(weights, {
    rule,
    country: countryOk ? input.country : null,
    handlingPercent: rules.handlingPercent,
    minimumOrderCents: rules.minimumOrderCents,
  });
  const canOrder = lines.length > 0 && lines.every((l) => !l.problem) && countryOk && totals.shortCents === 0;
  return { warehouse, country: input.country, countryOk, lines, totals, minimumOrderCents: rules.minimumOrderCents, canOrder };
}

export async function priceCart(input: CartInput): Promise<Quote> {
  const { checkout } = await getSettings();
  return priceCartSync(input, checkout);
}

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // no 0/O, 1/I/L

/** LP-YYMM-XXXXXX: human-friendly, non-sequential (doc 04). */
export function newOrderNumber(now = new Date()): string {
  const yymm = `${String(now.getUTCFullYear()).slice(2)}${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  let suffix = "";
  for (let i = 0; i < 6; i++) suffix += ALPHABET[randomInt(ALPHABET.length)];
  return `LP-${yymm}-${suffix}`;
}

export type CreatedOrder = { id: number; number: string; quote: Quote };

/**
 * Re-prices the cart and writes order + item snapshots + first event in one synchronous transaction.
 * Throws OrderError when the cart can no longer be ordered as shown.
 */
export function createOrderSync(cart: CartInput, fields: CheckoutFields, ip: string, rules: CheckoutRules): CreatedOrder {
  sqlite.exec("BEGIN IMMEDIATE");
  try {
    const quote = priceCartSync({ ...cart, country: fields.country }, rules);
    if (!quote.warehouse) throw new OrderError("This warehouse is not accepting orders. Please choose another one.");
    if (!quote.countryOk) throw new OrderError(`${quote.warehouse.name} does not ship to the selected country.`);
    if (quote.lines.length === 0 || quote.lines.some((l) => l.problem))
      throw new OrderError("Some products are no longer available from this warehouse. Please review your cart.");
    if (quote.totals.shortCents > 0) throw new OrderError("The order is below the minimum order value.");

    const now = Date.now();
    const insertOrder = sqlite.prepare(
      `INSERT INTO orders (number, status, warehouseCode, email, name, phone, country, addressLine1, addressLine2, city,
         region, postalCode, customerNote, subtotalCents, shippingCents, handlingCents, totalCents, ip, createdAt, updatedAt)
       VALUES (?, 'PENDING_PAYMENT', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    let number = "";
    let orderId = 0;
    for (let attempt = 0; attempt < 5 && !orderId; attempt++) {
      number = newOrderNumber();
      try {
        const res = insertOrder.run(
          number,
          quote.warehouse.code,
          fields.email,
          fields.name,
          fields.phone,
          fields.country,
          fields.addressLine1,
          fields.addressLine2,
          fields.city,
          fields.region,
          fields.postalCode,
          fields.customerNote,
          quote.totals.subtotalCents,
          quote.totals.shippingCents,
          quote.totals.handlingCents,
          quote.totals.totalCents,
          ip,
          now,
          now,
        );
        orderId = Number(res.lastInsertRowid);
      } catch (err) {
        if (!String(err).includes("UNIQUE")) throw err; // order number collision: try another
      }
    }
    if (!orderId) throw new Error("Could not allocate an order number");

    const insertItem = sqlite.prepare(
      `INSERT INTO order_items (orderId, productId, sku, name, specification, unitCents, listCents, qty, lineCents)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const l of quote.lines)
      insertItem.run(orderId, l.productId, l.sku, l.name, l.specification, l.unitCents, l.listCents, l.qty, l.lineCents);
    sqlite
      .prepare("INSERT INTO order_events (orderId, fromStatus, toStatus, note, createdAt) VALUES (?, NULL, 'PENDING_PAYMENT', ?, ?)")
      .run(orderId, "Order placed by customer", now);

    sqlite.exec("COMMIT");
    return { id: orderId, number, quote };
  } catch (err) {
    sqlite.exec("ROLLBACK");
    throw err;
  }
}

/** A problem the customer can fix (message is safe to show). */
export class OrderError extends Error {}
