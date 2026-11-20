import { and, eq, inArray } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { productPrices, products } from "@/db/schema";
import { getSettings, getWarehouses } from "./settings";

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

export const productHref = (slug: string) => `/peptide/${slug}.html`;

/**
 * "Factory hot products by warehouse": the curated `hotProducts` order, keeping the first 10 that are
 * enabled and sold in each warehouse (same rule as the live home page). Tag: "products".
 */
export async function getHotProductsByWarehouse() {
  "use cache";
  cacheLife("catalog");
  cacheTag("products", "settings");

  const [{ hotProducts }, whs] = await Promise.all([getSettings(), getWarehouses()]);
  if (hotProducts.length === 0) return whs.map((warehouse) => ({ warehouse, products: [] as ProductCardData[] }));

  const rows = await db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      images: products.images,
      warehouseCode: productPrices.warehouseCode,
      priceCents: productPrices.priceCents,
      listCents: productPrices.listCents,
      inStock: productPrices.inStock,
    })
    .from(products)
    .innerJoin(productPrices, eq(productPrices.productId, products.id))
    .where(and(eq(products.enabled, true), inArray(products.id, hotProducts)));

  const rank = new Map(hotProducts.map((id, i) => [id, i]));
  return whs.map((warehouse) => ({
    warehouse,
    products: rows
      .filter((r) => r.warehouseCode === warehouse.code)
      .sort((a, b) => rank.get(a.id)! - rank.get(b.id)!)
      .slice(0, 10)
      .map(
        (r): ProductCardData => ({
          id: r.id,
          slug: r.slug,
          name: r.name,
          image: r.images[0] ?? null,
          priceCents: r.priceCents,
          listCents: r.listCents,
          inStock: r.inStock,
        }),
      ),
  }));
}
