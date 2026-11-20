// Pricing rules vs the examples published on the live Shipping Policy and the live cart. Usage: npm run check:pricing
import { DEFAULT_SHIPPING_RULES as R, handlingCents, orderTotals, shippingCents } from "../src/lib/pricing";

const items = (n: number, kg: number | null = 0.075) => [{ unitCents: 1000, qty: n, weightKg: kg }];
const cases: [string, number, number][] = [
  // US warehouse: first item $30, +$5 per item
  ["US 1 item", shippingCents(R.USFC, "US", items(1)), 3000],
  ["US 2 items", shippingCents(R.USFC, "US", items(2)), 3500],
  ["US 4 items", shippingCents(R.USFC, "US", items(4)), 4500],
  // Australia warehouse: first item $20, +$5 per item
  ["AU 1 item", shippingCents(R.AUSFC, "AU", items(1)), 2000],
  ["AU 3 items", shippingCents(R.AUSFC, "AU", items(3)), 3000],
  // Asia warehouse: per 0.5 kg; US $85 first step, others $60, +$25 per step
  ["Asia→US up to 0.5 kg", shippingCents(R.CNFC, "US", items(1, 0.5)), 8500],
  ["Asia→US up to 1.0 kg", shippingCents(R.CNFC, "US", items(2, 0.5)), 11000],
  ["Asia→GB up to 0.5 kg", shippingCents(R.CNFC, "GB", items(6, 0.075)), 6000],
  ["Asia→GB up to 1.0 kg", shippingCents(R.CNFC, "GB", items(1, 0.9)), 8500],
  ["Asia→GB 1.01 kg", shippingCents(R.CNFC, "GB", items(1, 1.01)), 11000],
  ["Asia→GB missing weight = 0.075 kg", shippingCents(R.CNFC, "GB", items(1, null)), 6000],
  // Handling 5% of (products + shipping), rounded up to whole dollars
  ["handling $149.00", handlingCents(14900, 5), 800],
  ["handling $200.00 exact", handlingCents(20000, 5), 1000],
  ["handling $200.01", handlingCents(20001, 5), 1100],
  ["handling $0", handlingCents(0, 5), 0],
];

const t = orderTotals([{ unitCents: 6400, qty: 1, weightKg: 0.075 }], {
  rule: R.CNFC,
  country: "GB",
  handlingPercent: 5,
  minimumOrderCents: 19900,
});
cases.push(["total RT10 CNFC→GB", t.totalCents, 6400 + 6000 + 700], ["short of $199", t.shortCents, 19900 - 13100]);

let failed = 0;
for (const [name, got, want] of cases) {
  if (got !== want) {
    failed++;
    console.log(`FAIL ${name}: got ${got}, want ${want}`);
  }
}
console.log(`${cases.length - failed}/${cases.length} pricing checks passed`);
if (failed) process.exitCode = 1;
