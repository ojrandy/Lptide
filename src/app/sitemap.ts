import type { MetadataRoute } from "next";
import { productHref } from "@/lib/product-utils";
import { getCatalog, getCategories } from "@/lib/queries/products";
import { getSettings, getWarehouses } from "@/lib/queries/settings";

// /sitemap.xml (docs/05): every public, indexable URL with its canonical form.

const SITE = (process.env.SITE_URL ?? "https://lppeptide.com").replace(/\/$/, "");

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
  return [
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
}
