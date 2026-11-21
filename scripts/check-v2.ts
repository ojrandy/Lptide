// v2 business rules, end to end on a throwaway copy of the database (never the real one).
// Usage: npm run check:v2
// Covers: shipping rules engine at checkout, counted stock + low-stock + restore, payment reference, referral
// attribution (incl. self-referral), commission earn/void/hold/payout, guest-order linking, imported reviews.
import { copyFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import "./env";

const dir = mkdtempSync(join(tmpdir(), "lp-check-v2-"));
const dbFile = join(dir, "test.db");
// WAL mode: recent writes (e.g. a fresh migration) live in the -wal file until checkpoint, so copy all three.
const source = process.env.DATABASE_PATH ?? "./data/lppeptide.db";
for (const ext of ["", "-wal", "-shm"]) if (existsSync(source + ext)) copyFileSync(source + ext, dbFile + ext);
process.env.DATABASE_PATH = dbFile;

let failed = 0;
let close = () => {};
let passed = 0;
function check(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) passed++;
  else {
    failed++;
    console.log(`FAIL ${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
  }
}
function throws(name: string, fn: () => unknown, match: RegExp) {
  try {
    fn();
    check(name, "no error", String(match));
  } catch (err) {
    check(name, match.test(String(err)), true);
  }
}

async function main() {
  // Imported after DATABASE_PATH points at the copy.
  const { sqlite } = await import("../src/db");
  close = () => sqlite.close();
  const { priceCartSync, createOrderSync, restoreStockSync } = await import("../src/lib/orders");
  const aff = await import("../src/lib/affiliate");
  const { markVerifiedAndLinkOrders } = await import("../src/lib/customer-auth");

  const rules = { handlingPercent: 5, minimumOrderCents: 0 };
  const product = sqlite
    .prepare("SELECT p.id, pp.priceCents FROM products p JOIN product_prices pp ON pp.productId = p.id WHERE pp.warehouseCode = 'USFC' AND pp.inStock = 1 AND p.enabled = 1 LIMIT 1")
    .get() as { id: number; priceCents: number };
  const cart = (qty: number) => ({ warehouseCode: "USFC", country: "US", lines: [{ productId: product.id, qty }] });
  const fields = (email: string) => ({
    email,
    name: "Test Buyer",
    phone: "",
    country: "US",
    addressLine1: "1 Test St",
    addressLine2: "",
    city: "Testville",
    region: "",
    postalCode: "",
    customerNote: "",
    website: "",
  });
  const ctx = (o: Partial<{ customerId: number | null; referralCode: string | null }> = {}) => ({
    customerId: null,
    referralCode: null,
    paymentMethod: "Crypto (BTC / ETH / USDC)",
    locale: "es",
    ...o,
  });

  // --- shipping rules engine (migrated v1 rule: US $30 + $5/item)
  check("USFC 2 items shipping", priceCartSync(cart(2), rules).totals.shippingCents, 3500);
  sqlite
    .prepare("INSERT INTO shipping_rules (warehouseCode, name, countries, mode, firstCents, freeOverCents, sort) VALUES ('USFC', 'Free test', '[\"US\"]', 'flat', 999, 1, 1)")
    .run();
  const free = priceCartSync(cart(1), rules).totals;
  check("free-shipping rule wins by sort", [free.shippingCents, free.shippingRule], [0, "Free test"]);
  sqlite.prepare("DELETE FROM shipping_rules WHERE warehouseCode = 'USFC'").run();
  const none = priceCartSync(cart(1), rules);
  check("no rule → cannot order", [none.totals.noShippingRule, none.canOrder], [true, false]);
  throws("no rule → checkout refused", () => createOrderSync(cart(1), fields("a@test.dev"), "t", rules, ctx()), /no shipping option/);
  sqlite.prepare("INSERT INTO shipping_rules (warehouseCode, name, countries, mode, firstCents, additionalCents, sort) VALUES ('USFC', 'US', '[]', 'per_item', 3000, 500, 100)").run();

  // --- counted stock + low stock + restore on cancel
  sqlite.prepare("UPDATE warehouses SET lowStockThreshold = 5 WHERE code = 'USFC'").run();
  sqlite.prepare("UPDATE product_prices SET stockQty = 7, inStock = 1 WHERE productId = ? AND warehouseCode = 'USFC'").run(product.id);
  check("qty above stock → not_enough_stock", priceCartSync(cart(8), rules).lines[0].problem, "not_enough_stock");
  const o1 = createOrderSync(cart(3), fields("guest@test.dev"), "t", rules, ctx());
  const stockAfter = () => sqlite.prepare("SELECT stockQty, inStock FROM product_prices WHERE productId = ? AND warehouseCode = 'USFC'").get(product.id);
  check("stock decremented", stockAfter(), { stockQty: 4, inStock: 1 });
  check("low-stock crossing reported", o1.lowStock.map((l) => l.stockQty), [4]);
  check("payment reference format", /^LP[2-9A-HJ-NP-Z]{8}$/.test(o1.paymentRef), true);
  const row1 = sqlite.prepare("SELECT paymentRef, paymentMethod, locale, customerId FROM orders WHERE id = ?").get(o1.id) as Record<string, unknown>;
  check("order stores ref, method, locale", [row1.paymentRef, row1.paymentMethod, row1.locale, row1.customerId], [o1.paymentRef, "Crypto (BTC / ETH / USDC)", "es", null]);
  const o2 = createOrderSync(cart(4), fields("guest@test.dev"), "t", rules, ctx());
  check("stock reaches 0 → out of stock", stockAfter(), { stockQty: 0, inStock: 0 });
  check("no second low-stock alert below threshold", o2.lowStock.length, 0);
  restoreStockSync(o2.id);
  check("cancel restores stock", stockAfter(), { stockQty: 4, inStock: 1 });

  // --- accounts: guest orders link by email only through verification
  const custId = Number(
    sqlite.prepare("INSERT INTO customers (email, name, passwordHash, createdAt) VALUES ('guest@test.dev', 'Guest', 'x', ?)").run(Date.now()).lastInsertRowid,
  );
  check("orders not linked before verification", (sqlite.prepare("SELECT count(*) n FROM orders WHERE customerId = ?").get(custId) as { n: number }).n, 0);
  check("verification links guest orders", markVerifiedAndLinkOrders(custId), 2);

  // --- affiliate attribution, commission, hold, payout
  const affCustomer = Number(
    sqlite.prepare("INSERT INTO customers (email, name, createdAt, emailVerifiedAt) VALUES ('aff@test.dev', 'Aff', ?, ?)").run(Date.now(), Date.now()).lastInsertRowid,
  );
  const code = aff.newReferralCode();
  const affId = Number(
    sqlite.prepare("INSERT INTO affiliates (customerId, code, status, commissionPercent, createdAt) VALUES (?, ?, 'PENDING', 10, ?)").run(affCustomer, code, Date.now())
      .lastInsertRowid,
  );
  check("pending affiliate not resolvable", aff.approvedAffiliateId(code), null);
  sqlite.prepare("UPDATE affiliates SET status = 'APPROVED' WHERE id = ?").run(affId);
  check("approved affiliate resolvable", aff.approvedAffiliateId(code), affId);
  const selfRef = createOrderSync(cart(1), fields("aff@test.dev"), "t", rules, ctx({ referralCode: code }));
  check("self-referral not attributed", (sqlite.prepare("SELECT affiliateId FROM orders WHERE id = ?").get(selfRef.id) as { affiliateId: number | null }).affiliateId, null);
  const ref = createOrderSync(cart(2), fields("buyer@test.dev"), "t", rules, ctx({ referralCode: code.toLowerCase() }));
  check("referral attributed (case-insensitive)", (sqlite.prepare("SELECT affiliateId FROM orders WHERE id = ?").get(ref.id) as { affiliateId: number }).affiliateId, affId);
  const expected = Math.floor((product.priceCents * 2 * 10) / 100);
  check("commission = 10% of product subtotal", aff.earnCommissionSync(ref.id), expected);
  check("commission idempotent", aff.earnCommissionSync(ref.id), null);
  const payoutRules = { holdDays: 30, minPayoutCents: 0, payoutsPerMonth: 3 };
  check("on hold → no payout", aff.recordPayoutSync(affId, 1, "USDC", "0x1", "", payoutRules), { error: "Nothing is payable yet (commissions stay on hold after payment)." });
  check("minimum payout enforced", typeof aff.recordPayoutSync(affId, 1, "USDC", "0x1", "", { ...payoutRules, holdDays: 0, minPayoutCents: 10_000_000 }), "object");
  check("payout after hold", aff.recordPayoutSync(affId, 1, "USDC", "0x1", "", { ...payoutRules, holdDays: 0 }), expected);
  check("paid commission not voided by cancel", aff.voidCommissionSync(ref.id), false);
  const ref2 = createOrderSync(cart(1), fields("buyer2@test.dev"), "t", rules, ctx({ referralCode: code }));
  aff.earnCommissionSync(ref2.id);
  check("unpaid commission voided by cancel", aff.voidCommissionSync(ref2.id), true);
  const stats = aff.affiliateStats(affId, 0);
  check("stats", [stats.orders, stats.paidOutCents, stats.payableCents], [2, expected, 0]);

  // --- reviews / Q&A moved out of JSON columns
  const r = sqlite.prepare("SELECT count(*) n FROM product_reviews WHERE source = 'import' AND status = 'APPROVED'").get() as { n: number };
  const q = sqlite.prepare("SELECT count(*) n FROM product_questions WHERE source = 'import' AND status = 'APPROVED'").get() as { n: number };
  check("imported reviews and questions present", [r.n > 0, q.n > 0], [true, true]);
  const cols = (sqlite.prepare("PRAGMA table_info(products)").all() as { name: string }[]).map((c) => c.name);
  check("JSON columns dropped", [cols.includes("reviews"), cols.includes("qa")], [false, false]);

}

main()
  .catch((err) => {
    console.error(err);
    failed++;
  })
  .finally(() => {
    try {
      close();
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // Windows may keep the file locked a moment longer; the OS temp dir is cleaned anyway.
    }
    console.log(`${passed}/${passed + failed} v2 checks passed`);
    if (failed) process.exitCode = 1;
  });
