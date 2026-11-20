import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, productPrices, products } from "@/db/schema";

// Admin product reads (all products, including disabled ones; never cached). Callers ran requireAdmin().

export async function listAdminProducts() {
  const [rows, prices, cats] = await Promise.all([
    db
      .select({
        id: products.id,
        slug: products.slug,
        name: products.name,
        sku: products.sku,
        images: products.images,
        enabled: products.enabled,
        categoryId: products.categoryId,
      })
      .from(products)
      .orderBy(asc(products.sort), asc(products.id)),
    db.select().from(productPrices),
    db.select({ id: categories.id, name: categories.name }).from(categories),
  ]);
  const catName = new Map(cats.map((c) => [c.id, c.name]));
  return rows.map((r) => ({
    ...r,
    image: r.images[0] ?? null,
    category: catName.get(r.categoryId) ?? "",
    prices: prices.filter((p) => p.productId === r.id),
  }));
}

export async function getAdminProduct(id: number) {
  const [row] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!row) return null;
  const prices = await db.select().from(productPrices).where(eq(productPrices.productId, id));
  return { ...row, prices };
}

export async function listCategories() {
  return db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(asc(categories.sort));
}
