import type { ShippingRule } from "@/db/schema";

// Order pricing, same rules as the live cart (recovered from its bundle, 2026-11-20). Pure: used by the cart
// quote, placeOrder (the only source of truth for what is charged) and the admin. All money in cents.
//   shipping  per_item:   first item + (items - 1) × additional
//             per_weight: first step + (steps - 1) × additional, steps = ceil(weight / step), min 1
//             a destination override (e.g. Asia → US) replaces first/additional
//   handling  handlingPercent of (products + shipping), rounded UP to whole dollars
//   total     products + shipping + handling;  the order minimum is compared with the total

/** Weight used when a product has none recorded (live default: 0.075 kg). */
export const DEFAULT_ITEM_WEIGHT_KG = 0.075;

export type PricedLine = { unitCents: number; qty: number; weightKg: number | null };

export function shippingCents(rule: ShippingRule | null, country: string, lines: PricedLine[]): number {
  if (!rule || lines.length === 0) return 0;
  const rates = rule.overrides[country.toUpperCase()] ?? rule;
  if (rule.mode === "per_item") {
    const items = lines.reduce((n, l) => n + l.qty, 0);
    return items > 0 ? rates.firstCents + (items - 1) * rates.additionalCents : 0;
  }
  const grams = lines.reduce((g, l) => g + Math.round(((l.weightKg ?? 0) > 0 ? l.weightKg! : DEFAULT_ITEM_WEIGHT_KG) * 1000) * l.qty, 0);
  if (grams <= 0) return 0;
  const steps = Math.max(1, Math.ceil(grams / Math.max(1, rule.stepGrams)));
  return rates.firstCents + (steps - 1) * rates.additionalCents;
}

/** percent of base, rounded up to whole dollars (integer math, no float drift). */
export function handlingCents(baseCents: number, percent: number): number {
  if (baseCents <= 0 || percent <= 0) return 0;
  return Math.ceil((baseCents * percent) / 10000) * 100;
}

export type Totals = {
  subtotalCents: number;
  shippingCents: number;
  handlingCents: number;
  totalCents: number;
  /** How much is missing to reach the order minimum (0 when met or no minimum). */
  shortCents: number;
};

export function orderTotals(
  lines: PricedLine[],
  opts: { rule: ShippingRule | null; country: string | null; handlingPercent: number; minimumOrderCents: number },
): Totals {
  const subtotalCents = lines.reduce((s, l) => s + l.unitCents * l.qty, 0);
  const ship = opts.country ? shippingCents(opts.rule, opts.country, lines) : 0;
  const handling = handlingCents(subtotalCents + ship, opts.handlingPercent);
  const totalCents = subtotalCents + ship + handling;
  return {
    subtotalCents,
    shippingCents: ship,
    handlingCents: handling,
    totalCents,
    shortCents: Math.max(0, opts.minimumOrderCents - totalCents),
  };
}

/** Rules published on the live Shipping Policy page. Seeded once; the admin can edit them. */
export const DEFAULT_SHIPPING_RULES: Record<string, ShippingRule> = {
  USFC: { mode: "per_item", firstCents: 3000, additionalCents: 500, stepGrams: 500, overrides: {} },
  AUSFC: { mode: "per_item", firstCents: 2000, additionalCents: 500, stepGrams: 500, overrides: {} },
  CNFC: {
    mode: "per_weight",
    firstCents: 6000,
    additionalCents: 2500,
    stepGrams: 500,
    overrides: { US: { firstCents: 8500, additionalCents: 2500 } },
  },
};
