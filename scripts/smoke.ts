// URL parity smoke test (docs/05). Usage: npm run smoke -- [baseUrl]   (default http://localhost:3000)
// Checks status codes and redirect targets without following redirects. Exit code 1 on any failure.
import "./env";
import { readFileSync } from "node:fs";
import { asc } from "drizzle-orm";
import { db, sqlite } from "../src/db";
import { categories, warehouses } from "../src/db/schema";

const BASE = (process.argv[2] ?? process.env.SMOKE_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

type Check = { path: string; status: number; location?: string; contains?: string };

async function main() {
  const productPaths = [...readFileSync("_capture/SUMMARY.md", "utf8").matchAll(/\| (\/peptide\/[^ |]+\.html) \|/g)].map((m) => m[1]);
  const cats = await db.select({ slug: categories.slug }).from(categories).orderBy(asc(categories.sort));
  const whs = await db.select({ code: warehouses.code }).from(warehouses);

  const checks: Check[] = [
    { path: "/", status: 200, contains: "Factory hot products by warehouse" },
    { path: "/catalog/", status: 200, contains: "Research catalog, ready to source" },
    { path: "/catalog/?q=bpc", status: 200 },
    { path: "/best-sellers/", status: 200, contains: "Best Sellers" },
    ...whs.map((w) => ({ path: `/warehouse/${w.code.toLowerCase()}/`, status: 200 })),
    ...cats.map((c) => ({ path: `/category/${c.slug}/`, status: 200 })),
    ...productPaths.map((p) => ({ path: p, status: 200 })),
    // Content pages and tools (P3)
    { path: "/about/", status: 200, contains: "Our story" },
    { path: "/contact/", status: 200, contains: "Messaging channels" },
    { path: "/help/faq/", status: 200, contains: "On this page" },
    { path: "/help/fees/", status: 200, contains: "Payment confirmation" },
    { path: "/help/shipping/", status: 200, contains: "Track your shipment" },
    { path: "/legal/terms/", status: 200, contains: "Acceptance of terms" },
    { path: "/affiliate-program/", status: 200, contains: "Earn 10% from every eligible referral order." },
    { path: "/coa/", status: 200, contains: "COA Certificates" },
    { path: "/coa/rt10/", status: 200, contains: "RT10" },
    { path: "/coa/zz99/", status: 404 },
    // Live defaults 5 mg / 2 mL / 250 mcg / U-100 → 5,000 mcg · 2,500.0 mcg/mL · 25.0 mcg · 10.0 units · 0.1 mL · 20.0 doses
    { path: "/reconstitution-calculator/", status: 200, contains: "2,500.0 mcg/mL" },
    { path: "/reconstitution-calculator/", status: 200, contains: "10.0 units" },
    { path: "/cost-per-dose-calculator/", status: 200, contains: "$0.90" },
    { path: "/vial-duration-calculator/", status: 200, contains: "47 days" },
    { path: "/product-lookup/", status: 200, contains: "Product name or abbreviation" },
    // Order flow (P4)
    { path: "/cart/", status: 200, contains: "Your cart" },
    { path: "/checkout/", status: 200, contains: "Checkout" },
    { path: "/login/", status: 200, contains: "Find your order" },
    { path: "/account/", status: 200, contains: "Find your order" },
    { path: "/order/LP-2611-AAAAAA/?t=forged", status: 200, contains: "could not be found" },
    // SEO files (P6)
    { path: "/sitemap.xml", status: 200, contains: "/peptide/retatrutide-10mg-rt10.html" },
    { path: "/robots.txt", status: 200, contains: "Disallow: /admin" },
    // Admin is gated (P5)
    { path: "/admin/", status: 307, location: "/admin/login/" },
    { path: "/admin/orders/", status: 307, location: "/admin/login/" },
    { path: "/admin/settings/", status: 307, location: "/admin/login/" },
    { path: "/admin/login/", status: 200 },
    // Redirects and errors
    { path: "/catalog", status: 308, location: "/catalog/" },
    { path: "/peptide/retatrutide-10mg-rt10/", status: 301, location: "/peptide/retatrutide-10mg-rt10.html" },
    { path: "/category/weight-loss-and-metabolic/", status: 301, location: "/category/weight-loss-metabolic/" },
    { path: "/es/catalog/", status: 302, location: "/catalog/" },
    { path: "/pt/", status: 302, location: "/" },
    { path: "/peptide/does-not-exist.html", status: 404 },
    { path: "/warehouse/xx/", status: 404 },
    { path: "/uploads/../package.json", status: 404 },
  ];

  let failed = 0;
  for (const c of checks) {
    const res = await fetch(BASE + c.path, { redirect: "manual" });
    const location = res.headers.get("location")?.replace(BASE, "");
    const body = c.contains ? await res.text() : "";
    const problems = [
      res.status !== c.status && `status ${res.status} (want ${c.status})`,
      c.location && location !== c.location && `location ${location} (want ${c.location})`,
      c.contains && !body.includes(c.contains) && `missing "${c.contains}"`,
    ].filter(Boolean);
    if (problems.length) {
      failed++;
      console.log(`FAIL ${c.path}  ${problems.join("; ")}`);
    }
  }
  console.log(`${checks.length - failed}/${checks.length} passed (${productPaths.length} product URLs from _capture/SUMMARY.md) against ${BASE}`);
  if (failed) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => sqlite.close());
