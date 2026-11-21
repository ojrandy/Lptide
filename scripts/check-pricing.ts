// Pricing rules vs the examples published on the live Shipping Policy and the live cart, plus the v2 rules engine
// (weight bands, item-count bands, country groups, free-shipping threshold). Usage: npm run check:pricing
import { defaultRules, handlingCents, orderTotals, quoteShipping, type Rule } from "../src/lib/pricing";

const items = (n: number, kg: number | null = 0.075, unitCents = 1000) => [{ unitCents, qty: n, weightKg: kg }];
const fee = (rules: Rule[], country: string, lines: ReturnType<typeof items>) => quoteShipping(rules, country, lines)?.cents ?? -1;
const US = defaultRules("USFC");
const AU = defaultRules("AUSFC");
const CN = defaultRules("CNFC");

const cases: [string, number | string | null, number | string | null][] = [
  // US warehouse: first item $30, +$5 per item
  ["US 1 item", fee(US, "US", items(1)), 3000],
  ["US 2 items", fee(US, "US", items(2)), 3500],
  ["US 4 items", fee(US, "US", items(4)), 4500],
  // Australia warehouse: first item $20, +$5 per item
  ["AU 1 item", fee(AU, "AU", items(1)), 2000],
  ["AU 3 items", fee(AU, "AU", items(3)), 3000],
  // Asia warehouse: per 0.5 kg; US $85 first step, others $60, +$25 per step
  ["Asia→US up to 0.5 kg", fee(CN, "US", items(1, 0.5)), 8500],
  ["Asia→US up to 1.0 kg", fee(CN, "US", items(2, 0.5)), 11000],
  ["Asia→GB up to 0.5 kg", fee(CN, "GB", items(6, 0.075)), 6000],
  ["Asia→GB up to 1.0 kg", fee(CN, "GB", items(1, 0.9)), 8500],
  ["Asia→GB 1.01 kg", fee(CN, "GB", items(1, 1.01)), 11000],
  ["Asia→GB missing weight = 0.075 kg", fee(CN, "GB", items(1, null)), 6000],
  ["Asia→us lowercase country uses the US rule", fee(CN, "us", items(1, 0.5)), 8500],
  // Handling 5% of (products + shipping), rounded up to whole dollars
  ["handling $149.00", handlingCents(14900, 5), 800],
  ["handling $200.00 exact", handlingCents(20000, 5), 1000],
  ["handling $200.01", handlingCents(20001, 5), 1100],
  ["handling $0", handlingCents(0, 5), 0],
];

// v2 engine: bands, groups, thresholds, ordering, inactive rules, no match.
const base = { id: 0, minGrams: 0, maxGrams: null, minItems: 1, maxItems: null, additionalCents: 0, stepGrams: 500, freeOverCents: null, active: true };
const engine: Rule[] = [
  { ...base, id: 1, name: "EU light", countries: ["DE", "FR"], maxGrams: 500, mode: "flat", firstCents: 2000, sort: 10 },
  { ...base, id: 2, name: "EU heavy", countries: ["DE", "FR"], minGrams: 501, mode: "per_weight", firstCents: 3000, additionalCents: 1000, sort: 20 },
  { ...base, id: 3, name: "Bulk 10+", countries: [], minItems: 10, mode: "flat", firstCents: 5000, sort: 30 },
  { ...base, id: 4, name: "Disabled", countries: [], mode: "flat", firstCents: 1, sort: 0, active: false },
  { ...base, id: 5, name: "Standard", countries: [], maxItems: 9, mode: "per_item", firstCents: 1500, additionalCents: 300, freeOverCents: 50000, sort: 100 },
];
const rule = (country: string, lines: ReturnType<typeof items>) => quoteShipping(engine, country, lines)?.rule.name ?? null;
cases.push(
  ["DE 0.5 kg → EU light (weight band upper bound inclusive)", rule("DE", items(1, 0.5)), "EU light"],
  ["DE 0.5 kg fee flat", fee(engine, "DE", items(1, 0.5)), 2000],
  ["FR 1.2 kg → EU heavy, 3 steps", fee(engine, "FR", items(2, 0.6)), 3000 + 2 * 1000],
  ["GB 12 items → Bulk 10+ (item band)", rule("GB", items(12)), "Bulk 10+"],
  ["GB 12 items fee", fee(engine, "GB", items(12)), 5000],
  ["GB 3 items → Standard (inactive rule skipped)", fee(engine, "GB", items(3)), 1500 + 2 * 300],
  ["GB subtotal $500 → free shipping", fee(engine, "GB", items(1, 0.075, 50000)), 0],
  ["GB subtotal $499.99 → not free", fee(engine, "GB", items(1, 0.075, 49999)), 1500],
  ["no rules → no quote", quoteShipping([], "GB", items(1)) === null ? "none" : "quote", "none"],
);

const t = orderTotals([{ unitCents: 6400, qty: 1, weightKg: 0.075 }], {
  rules: CN,
  country: "GB",
  handlingPercent: 5,
  minimumOrderCents: 19900,
});
cases.push(["total RT10 CNFC→GB", t.totalCents, 6400 + 6000 + 700], ["short of $199", t.shortCents, 19900 - 13100], ["rule name", t.shippingRule, "Asia standard"]);
const none = orderTotals([{ unitCents: 6400, qty: 1, weightKg: 0.075 }], { rules: [], country: "GB", handlingPercent: 5, minimumOrderCents: 0 });
cases.push(["no rule → flagged, shipping 0", `${none.noShippingRule}/${none.shippingCents}`, "true/0"]);

let failed = 0;
for (const [name, got, want] of cases) {
  if (got !== want) {
    failed++;
    console.log(`FAIL ${name}: got ${got}, want ${want}`);
  }
}
console.log(`${cases.length - failed}/${cases.length} pricing checks passed`);
if (failed) process.exitCode = 1;
