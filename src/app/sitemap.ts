import type { MetadataRoute } from "next";
import { HTML_LANG, LOCALES, localePath } from "@/i18n/config";
import { productHref } from "@/lib/product-utils";
import { getCatalog, getCategories } from "@/lib/queries/products";
import { getSettings, getWarehouses } from "@/lib/queries/settings";

// /sitemap.xml (docs/05): every public, indexable URL with its canonical form, in all three languages. Each entry lists its
// versions as hreflang alternates (same as the pages' own <link rel="alternate">).

const SITE = (process.env.SITE_URL ?? "https://lppeptide.co").replace(/\/$/, "");

const STATIC_PAGES = [
  "/",
  "/catalog/",
  "/best-sellers/",
  "/coa/",
  "/reconstitution-calculator/",
  "/cost-per-dose-calculator/",
  "/vial-duration-calculator/",
  "/product-lookup/",
  "/affiliate-program/",
  "/about/",
  "/contact/",
  "/help/faq/",
  "/help/fees/",
  "/help/shipping/",
  "/legal/terms/",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, warehouses, { coaCertificates }] = await Promise.all([
    getCatalog(),
    getCategories(),
    getWarehouses(),
    getSettings(),
  ]);
  const url = (path: string) => `${SITE}${path}`;
  const alternates = (path: string) => ({
    languages: { ...Object.fromEntries(LOCALES.map((l) => [HTML_LANG[l], url(localePath(l, path))])), "x-default": url(path) },
  });
  const entries: MetadataRoute.Sitemap = [
    ...STATIC_PAGES.map((p) => ({ url: url(p), changeFrequency: "weekly" as const, priority: p === "/" ? 1 : 0.6 })),
    ...warehouses.map((w) => ({ url: url(`/warehouse/${w.code.toLowerCase()}/`), changeFrequency: "daily" as const, priority: 0.8 })),
    ...categories.map((c) => ({ url: url(`/category/${c.slug}/`), changeFrequency: "weekly" as const, priority: 0.7 })),
    ...products.map((p) => ({
      url: url(productHref(p.slug)),
      lastModified: new Date(p.updatedAt),
      changeFrequency: "daily" as const,
      priority: 0.9,
      images: p.image ? [url(p.image)] : undefined,
    })),
    ...[...new Set(coaCertificates.map((c) => c.sku.toLowerCase()))].map((code) => ({ url: url(`/coa/${code}/`), priority: 0.4 })),
  ];
  // Each language version is its own self-canonical page, so each gets its own <url> carrying the full hreflang set
  // (Google: every URL in a hreflang cluster lists all versions, itself included).
  return entries.flatMap((e) => {
    const path = e.url.slice(SITE.length);
    return LOCALES.map((l) => ({ ...e, url: url(localePath(l, path)), alternates: alternates(path) }));
  });
}
