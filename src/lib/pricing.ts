import type { ShippingMode } from "@/db/schema";

// Order pricing, same rules as the live cart (recovered from its bundle, 2026-11-20), with the v2 shipping rules
// engine (docs/10 V10). Pure: used by the cart quote, placeOrder (the only source of truth for what is charged),
// the admin shipping tester and scripts/check-pricing.ts. All money in cents.
//   shipping  the first active rule (lowest sort) whose country list, weight band and item-count band match:
//             flat:       firstCents
//             per_item:   first item + (items - 1) × additional
//             per_weight: first step + (steps - 1) × additional, steps = ceil(weight / step), min 1
//             free when the product subtotal reaches the rule's freeOverCents
//             no matching rule → the cart cannot ship to that country (null)
//   handling  handlingPercent of (products + shipping), rounded UP to whole dollars
//   total     products + shipping + handling;  the order minimum is compared with the total

/** Weight used when a product has none recorded (live default: 0.075 kg). */
export const DEFAULT_ITEM_WEIGHT_KG = 0.075;

export type PricedLine = { unitCents: number; qty: number; weightKg: number | null };

export type Rule = {
  id: number;
  name: string;
  countries: string[];
  minGrams: number;
  maxGrams: number | null;
  minItems: number;
  maxItems: number | null;
  mode: ShippingMode;
  firstCents: number;
  additionalCents: number;
  stepGrams: number;
  freeOverCents: number | null;
  sort: number;
  active: boolean;
};

export const cartGrams = (lines: PricedLine[]) =>
  lines.reduce((g, l) => g + Math.round(((l.weightKg ?? 0) > 0 ? l.weightKg! : DEFAULT_ITEM_WEIGHT_KG) * 1000) * l.qty, 0);
export const cartItems = (lines: PricedLine[]) => lines.reduce((n, l) => n + l.qty, 0);

/** The rule that prices this shipment, or null when none matches. */
export function matchRule(rules: Rule[], country: string, lines: PricedLine[]): Rule | null {
  const c = country.toUpperCase();
  const grams = cartGrams(lines);
  const items = cartItems(lines);
  return (
    [...rules]
      .sort((a, b) => a.sort - b.sort || a.id - b.id)
      .find(
        (r) =>
          r.active &&
          (r.countries.length === 0 || r.countries.includes(c)) &&
          grams >= r.minGrams &&
          (r.maxGrams == null || grams <= r.maxGrams) &&
          items >= r.minItems &&
          (r.maxItems == null || items <= r.maxItems),
      ) ?? null
  );
}

/** Fee for a shipment under one rule. */
export function ruleCents(rule: Rule, lines: PricedLine[]): number {
  const items = cartItems(lines);
  if (items === 0) return 0;
  const subtotal = lines.reduce((s, l) => s + l.unitCents * l.qty, 0);
  if (rule.freeOverCents != null && subtotal >= rule.freeOverCents) return 0;
  if (rule.mode === "flat") return rule.firstCents;
  if (rule.mode === "per_item") return rule.firstCents + (items - 1) * rule.additionalCents;
  const steps = Math.max(1, Math.ceil(cartGrams(lines) / Math.max(1, rule.stepGrams)));
  return rule.firstCents + (steps - 1) * rule.additionalCents;
}

export type ShippingQuote = { cents: number; rule: Rule } | null;

export function quoteShipping(rules: Rule[], country: string, lines: PricedLine[]): ShippingQuote {
  if (lines.length === 0) return null;
  const rule = matchRule(rules, country, lines);
  return rule ? { cents: ruleCents(rule, lines), rule } : null;
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
  /** Name of the shipping rule used; null when no country yet or no rule matches. */
  shippingRule: string | null;
  /** A country is set but no shipping rule covers this cart. */
  noShippingRule: boolean;
};

export function orderTotals(
  lines: PricedLine[],
  opts: { rules: Rule[]; country: string | null; handlingPercent: number; minimumOrderCents: number },
): Totals {
  const subtotalCents = lines.reduce((s, l) => s + l.unitCents * l.qty, 0);
  const ship = opts.country && lines.length ? quoteShipping(opts.rules, opts.country, lines) : null;
  const shipping = ship?.cents ?? 0;
  const handling = handlingCents(subtotalCents + shipping, opts.handlingPercent);
  const totalCents = subtotalCents + shipping + handling;
  return {
    subtotalCents,
    shippingCents: shipping,
    handlingCents: handling,
    totalCents,
    shortCents: Math.max(0, opts.minimumOrderCents - totalCents),
    shippingRule: ship?.rule.name ?? null,
    noShippingRule: !!opts.country && lines.length > 0 && !ship,
  };
}

type RuleSeed = Omit<Rule, "id" | "active" | "minGrams" | "maxGrams" | "minItems" | "maxItems" | "freeOverCents">;

/** Rules published on the live Shipping Policy page. Inserted by the seed when a warehouse has no rules. */
export const DEFAULT_SHIPPING_RULES: Record<string, RuleSeed[]> = {
  USFC: [{ name: "US standard", countries: [], mode: "per_item", firstCents: 3000, additionalCents: 500, stepGrams: 500, sort: 100 }],
  AUSFC: [{ name: "Australia standard", countries: [], mode: "per_item", firstCents: 2000, additionalCents: 500, stepGrams: 500, sort: 100 }],
  CNFC: [
    { name: "Asia to US", countries: ["US"], mode: "per_weight", firstCents: 8500, additionalCents: 2500, stepGrams: 500, sort: 10 },
    { name: "Asia standard", countries: [], mode: "per_weight", firstCents: 6000, additionalCents: 2500, stepGrams: 500, sort: 100 },
  ],
};

/** Full rule objects from the defaults (seed + checks). */
export function defaultRules(code: string): Rule[] {
  return (DEFAULT_SHIPPING_RULES[code] ?? []).map((r, i) => ({
    ...r,
    id: i + 1,
    active: true,
    minGrams: 0,
    maxGrams: null,
    minItems: 1,
    maxItems: null,
    freeOverCents: null,
  }));
}
