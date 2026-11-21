import { NextResponse, type NextRequest } from "next/server";
import { sqlite } from "@/db";
import { approvedAffiliateId, recordClick, REF_CODE, REF_COOKIE, REF_MAX_AGE } from "@/lib/affiliate";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

// Admin: /admin/* (except /admin/login/) needs a valid session cookie; pages and actions re-check with requireAdmin().
// URL parity with the live site (docs/05). Every rule below feeds one canonical path, so any request needs
// at most ONE redirect (next.config.ts sets skipTrailingSlashRedirect; trailing slashes are added here):
//   /peptide/{slug}, /peptide/{slug}/, /peptide/{slug}.html/ → 301 /peptide/{slug}.html
//   /category/{a}-and-{b}/                                  → 301 /category/{a}-{b}/   (spelling used by live catalog links)
//   /en/*                                                   → 301 /*                   (English is unprefixed)
//   any other page path without a trailing slash            → 308 path/                (trailingSlash: true)
// The same rules apply under /es and /pt (v2 locales, docs/10 V4).
// Paths whose last segment has a dot (files, sitemap.xml, robots.txt, but not .html) never get a slash.
//
// Locales: storefront pages live under app/(store)/[lang]. /x is rewritten to /en/x internally; /es/x and /pt/x are
// served as they are. Admin, auth callbacks, uploads and files are not localised.
//
// Host: www.{SITE_URL host} (or the bare host when SITE_URL uses www) → 301 to SITE_URL, before anything else.
//
// Referrals (V2-4): ?ref=CODE on any page sets the lp_ref cookie (30 days), counts one click per new cookie, and
// redirects (302) to the same URL without the parameter.
//
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

type RedirectStatus = 301 | 308;
const UNLOCALISED = /^\/(admin|auth|uploads)(\/|$)/;

/** True for static files (last segment has a dot), except .html product pages. */
const isFile = (path: string) => {
  const last = path.slice(path.lastIndexOf("/") + 1);
  return last.includes(".") && !last.endsWith(".html");
};

/** The canonical form of a path, and the status to redirect with when it differs from the request. */
function canonicalPath(pathname: string): { path: string; prefix: string; status: RedirectStatus } {
  let status: RedirectStatus = 308;
  const m = pathname.match(/^\/(en|es|pt)(\/.*)?$/);
  // /en/x → /x (301); /es/x, /pt/x keep their prefix.
  const prefix = m && m[1] !== "en" ? `/${m[1]}` : "";
  if (m?.[1] === "en") status = 301;
  let path = m ? m[2] || "/" : pathname;

  const product = path.match(/^\/peptide\/([^/]+?)(\.html)?\/?$/);
  if (product) {
    const target = `/peptide/${product[1]}.html`;
    if (path !== target) {
      path = target;
      status = 301;
    }
    return { path, prefix, status };
  }

  const category = path.match(/^\/category\/([^/]*-and-[^/]*)\/?$/);
  if (category) {
    path = `/category/${category[1].replaceAll("-and-", "-")}/`;
    status = 301;
  }

  const last = path.slice(path.lastIndexOf("/") + 1);
  if (!path.endsWith("/") && !last.includes(".")) path += "/";

  return { path, prefix, status };
}

/** SITE_URL's origin and host ("https://lppeptide.co", "lppeptide.co"), or null when unset/invalid. */
const SITE = (() => {
  try {
    const u = new URL(process.env.SITE_URL ?? "");
    return { origin: u.origin, host: u.host.toLowerCase() };
  } catch {
    return null;
  }
})();

export async function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;

  // One host: www.lppeptide.co ↔ lppeptide.co (whichever form SITE_URL uses) gets a 301 to SITE_URL, same path and
  // query. Keeps the session/cart cookies on one host and gives search engines one copy of each page.
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").toLowerCase();
  if (SITE && host && host !== SITE.host && (host === `www.${SITE.host}` || `www.${host}` === SITE.host))
    return NextResponse.redirect(`${SITE.origin}${pathname}${search}`, 301);
  // Next internals and the .well-known tree pass through untouched.
  if (pathname.startsWith("/_next/") || pathname.startsWith("/__nextjs") || pathname.startsWith("/.well-known/")) return NextResponse.next();

  // Admin, auth handlers, uploads and plain files: no locale, no rewrite.
  if (UNLOCALISED.test(pathname) || (isFile(pathname) && !/^\/(es|pt|en)\//.test(pathname))) {
    const canonical = canonicalPath(pathname);
    const isAdmin = canonical.path.startsWith("/admin/");
    if (isAdmin && !canonical.path.startsWith("/admin/login/")) {
      if (!(await verifySession(request.cookies.get(SESSION_COOKIE)?.value)))
        return NextResponse.redirect(new URL("/admin/login/", request.url));
    }
    if (canonical.path !== pathname && !isFile(pathname)) return NextResponse.redirect(new URL(canonical.path + search, request.url), canonical.status);
    const res = NextResponse.next();
    if (isAdmin) res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }

  const canonical = canonicalPath(pathname);
  const target = canonical.prefix + canonical.path;

  // Referral link: remember the affiliate for 30 days, then drop ?ref from the URL.
  const ref = searchParams.get("ref")?.trim().toUpperCase();
  if (ref !== undefined) {
    const clean = new URL(target, request.url);
    for (const [k, v] of searchParams) if (k !== "ref") clean.searchParams.append(k, v);
    const res = NextResponse.redirect(clean, 302);
    const affiliateId = ref && REF_CODE.test(ref) ? approvedAffiliateId(ref) : null;
    if (affiliateId) {
      if (request.cookies.get(REF_COOKIE)?.value !== ref) recordClick(affiliateId, canonical.path);
      res.cookies.set(REF_COOKIE, ref, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: REF_MAX_AGE });
    }
    return res;
  }

  if (target !== pathname) return NextResponse.redirect(new URL(target + search, request.url), canonical.status);

  // Rewriting to an unmatched path renders src/app/global-not-found.tsx with status 404.
  const notFound = () => NextResponse.rewrite(new URL("/en/__not-found__/", request.url), { status: 404 });
  const path = canonical.path;
  const param = (re: RegExp) => {
    const m = path.match(re);
    return m ? decodeURIComponent(m[1]) : null;
  };

  const product = param(/^\/peptide\/([^/]+)\.html$/);
  if (product !== null && !exists.product.get(product)) return notFound();
  const category = param(/^\/category\/([^/]+)\/$/);
  if (category !== null && !exists.category.get(category)) return notFound();
  const warehouse = param(/^\/warehouse\/([^/]+)\/$/);
  if (warehouse !== null && !exists.warehouse.get(warehouse)) return notFound();
  const coa = param(/^\/coa\/([^/]+)\/$/);
  if (coa !== null && !exists.coa.get(coa)) return notFound();

  // English pages are served from the [lang]=en tree; /es and /pt already carry their segment.
  if (!canonical.prefix) return NextResponse.rewrite(new URL(`/en${path}${search}`, request.url));
  return NextResponse.next();
}

export const config = {
  // Every path except Next's build output and image optimizer.
  matcher: ["/((?!_next/static|_next/image).*)"],
};
