// Product types and pure helpers. Safe for client components (no database imports).

export type WarehousePrice = { warehouseCode: string; priceCents: number; listCents: number; inStock: boolean };

/** What a product card needs, priced for one warehouse. */
export type ProductCardData = {
  id: number;
  slug: string;
  name: string;
  image: string | null;
  priceCents: number;
  listCents: number;
  inStock: boolean;
};

/** Listing data for one product (no long-form content), with its price in every warehouse that sells it. */
export type CatalogProduct = {
  id: number;
  slug: string;
  name: string;
  shortName: string;
  subtitle: string;
  description: string;
  sku: string;
  specification: string;
  packageSize: string;
  amountMg: number | null;
  categoryId: number;
  image: string | null;
  tags: string[];
  rating: number;
  reviewCount: number;
  coaUrl: string | null;
  sort: number;
  updatedAt: number;
  prices: WarehousePrice[];
};

export const productHref = (slug: string) => `/peptide/${slug}.html`;

/** Catalog price when no warehouse is chosen: the lowest list price (what the live catalog shows). */
export const catalogPriceCents = (p: { prices: WarehousePrice[] }) =>
  p.prices.length ? Math.min(...p.prices.map((x) => x.listCents)) : 0;

/** Buy-box "Product specification" text, as the live site formats it: "10mg x 10 vials" + "10 vials / box" -> "10mg x 10 vials /box". */
export function specWithBox(specification: string, packageSize: string) {
  const s = specification.trim().replace(/\s*\/\s*box\b/gi, " /box").replace(/\s+per\s+box\b/gi, " /box");
  return !s || /\s\/box\b/i.test(s) ? s : /\bbox\b/i.test(packageSize) ? `${s} /box` : s;
}

export const inStockAnywhere =(p: { prices: WarehousePrice[] }) => p.prices.some((x) => x.inStock);
