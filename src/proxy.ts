import { NextResponse, type NextRequest } from "next/server";
import { sqlite } from "@/db";

// URL parity with the live site (docs/05). Admin gating is added here in P5.
//   /peptide/{slug} or /peptide/{slug}/ → 301 /peptide/{slug}.html   (category intros link without .html)
//   /peptide/{slug}.html/              → 301 /peptide/{slug}.html
//   /category/{a}-and-{b}/             → 301 /category/{a}-{b}/      (spelling used by live catalog links)
//   /es/* and /pt/*                    → 302 English path            (locales are v2)
// Unknown product, category, warehouse and COA codes get a real 404 status here: pages are partially
// prerendered, so a notFound() thrown while streaming would arrive with status 200 (a soft 404).

const exists = {
  product: sqlite.prepare("SELECT 1 FROM products WHERE slug = ? AND enabled = 1"),
  category: sqlite.prepare("SELECT 1 FROM categories WHERE slug = ?"),
  warehouse: sqlite.prepare("SELECT 1 FROM warehouses WHERE code = ? COLLATE NOCASE AND active = 1"),
  coa: sqlite.prepare(
    "SELECT 1 FROM settings, json_each(settings.value) WHERE settings.key = 'coaCertificates' AND upper(json_extract(json_each.value, '$.sku')) = upper(?)",
  ),
};

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const to = (path: string, status: 301 | 302) => NextResponse.redirect(new URL(path + search, request.url), status);
  // Rewriting to an unmatched path renders src/app/global-not-found.tsx with status 404.
  const notFound = () => NextResponse.rewrite(new URL("/__not-found__", request.url), { status: 404 });

  const locale = pathname.match(/^\/(?:es|pt)(\/.*)?$/);
  if (locale) return to(locale[1] && locale[1] !== "/" ? locale[1] : "/", 302);

  const product = pathname.match(/^\/peptide\/([^/]+?)(\.html)?\/?$/);
  if (product) {
    if (!product[2] || pathname.endsWith("/")) return to(`/peptide/${product[1]}.html`, 301);
    if (!exists.product.get(decodeURIComponent(product[1]))) return notFound();
  }

  const category = pathname.match(/^\/category\/([^/]+)\/$/);
  if (category) {
    if (category[1].includes("-and-")) return to(`/category/${category[1].replaceAll("-and-", "-")}/`, 301);
    if (!exists.category.get(decodeURIComponent(category[1]))) return notFound();
  }

  const warehouse = pathname.match(/^\/warehouse\/([^/]+)\/$/);
  if (warehouse && !exists.warehouse.get(decodeURIComponent(warehouse[1]))) return notFound();

  const coa = pathname.match(/^\/coa\/([^/]+)\/$/);
  if (coa && !exists.coa.get(decodeURIComponent(coa[1]))) return notFound();

  return NextResponse.next();
}

export const config = {
  matcher: ["/peptide/:path*", "/category/:path*", "/warehouse/:path*", "/coa/:path+", "/es", "/es/:path*", "/pt", "/pt/:path*"],
};
