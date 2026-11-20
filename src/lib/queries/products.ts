import { and, asc, eq, inArray } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { categories, productPrices, products } from "@/db/schema";
import type { CatalogProduct, ProductCardData, WarehousePrice } from "@/lib/product-utils";
import { getSettings, getWarehouses } from "./settings";

const productOrder = [asc(products.sort), asc(products.id)];

/** Every enabled product, in catalog order. Tag: "products". */
export async function getCatalog(): Promise<CatalogProduct[]> {
  "use cache";
  cacheLife("catalog");
  cacheTag("products");

  const rows = await db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      shortName: products.shortName,
      subtitle: products.subtitle,
      description: products.description,
      sku: products.sku,
      specification: products.specification,
      categoryId: products.categoryId,
      images: products.images,
      tags: products.tags,
      rating: products.rating,
      reviewCount: products.reviewCount,
      coaUrl: products.coaUrl,
      sort: products.sort,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .where(eq(products.enabled, true))
    .orderBy(...productOrder);

  const prices = await db.select().from(productPrices);
  const byProduct = new Map<number, WarehousePrice[]>();
  for (const { productId, ...p } of prices) {
    const list = byProduct.get(productId) ?? [];
    list.push(p);
    byProduct.set(productId, list);
  }

  return rows.map(({ images, updatedAt, ...r }) => ({
    ...r,
    image: images[0] ?? null,
    updatedAt: updatedAt.getTime(),
    prices: byProduct.get(r.id) ?? [],
  }));
}

/** Categories in display order. Tag: "products". */
export async function getCategories() {
  "use cache";
  cacheLife("catalog");
  cacheTag("products");
  return db.select().from(categories).orderBy(asc(categories.sort));
}

/** One enabled product with all its content and prices, or null. Tag: "products". */
export async function getProduct(slug: string) {
  "use cache";
  cacheLife("catalog");
  cacheTag("products");

  const [row] = await db
    .select({ product: products, category: categories })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(and(eq(products.slug, slug), eq(products.enabled, true)))
    .limit(1);
  if (!row) return null;

  const prices = await db
    .select({
      warehouseCode: productPrices.warehouseCode,
      priceCents: productPrices.priceCents,
      listCents: productPrices.listCents,
      inStock: productPrices.inStock,
    })
    .from(productPrices)
    .where(eq(productPrices.productId, row.product.id));

  return { ...row.product, category: row.category, prices };
}

/**
 * "Factory hot products by warehouse": the curated `hotProducts` order, keeping the first 10 that are
 * enabled and sold in each warehouse (same rule as the live home page). Tags: "products", "settings".
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
