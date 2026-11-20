import type { CatalogProduct } from "./product-utils";

// Display rules shared by catalog, category, best-seller and warehouse pages (as on the live site).

const TONES: Record<string, string> = {
  "weight-loss-metabolic": "weight",
  "anti-aging-longevity": "longevity",
  "repair-healing": "repair",
  "performance-growth": "performance",
};
export const heroTone = (categorySlug: string) => `hero-tone-${TONES[categorySlug] ?? "category"}`;

/** "COA-verified" on the live site = tagged "COA". */
export const isCoaVerified = (p: Pick<CatalogProduct, "tags">) => p.tags.includes("COA");

export function shelfStats(list: CatalogProduct[]) {
  const rated = list.filter((p) => p.rating > 0);
  const avg = rated.length ? rated.reduce((s, p) => s + p.rating, 0) / rated.length : 0;
  const updated = list.length ? Math.max(...list.map((p) => p.updatedAt)) : Date.now();
  return {
    count: list.length,
    coaCount: list.filter(isCoaVerified).length,
    averageRating: avg.toFixed(1),
    lastUpdated: new Date(updated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }),
  };
}

export const categoryDescription = (name: string, count: number, coaCount: number) =>
  `Browse ${count} factory-direct products in ${name}, including ${coaCount} COA-verified listings.`;

export const catalogDescription = (count: number, coaCount: number) =>
  `Browse our complete catalog of ${count} factory-direct LPPEPTIDE products, including ${coaCount} COA-verified listings.`;

export const formatCount = (n: number) => n.toLocaleString("en-US");

/** "★★★★☆" for a 0–5 rating (rounded to the nearest star). */
export const stars = (rating: number) => {
  const full = Math.max(0, Math.min(5, Math.round(rating)));
  return "★".repeat(full) + "☆".repeat(5 - full);
};

/** Product search used by the header search (?q=): name, short name, SKU, specification. */
export function matchesQuery(p: CatalogProduct, q: string) {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const hay = `${p.name} ${p.shortName} ${p.sku} ${p.specification} ${p.tags.join(" ")}`.toLowerCase();
  return terms.every((t) => hay.includes(t));
}
