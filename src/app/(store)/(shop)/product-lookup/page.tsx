import type { Metadata } from "next";
import { CalculatorShell } from "@/components/store/calculator/CalculatorShell";
import { ProductLookupTool, type LookupProduct } from "@/components/store/calculator/Tools";
import { catalogPriceCents } from "@/lib/product-utils";
import { getCatalog, getCategories } from "@/lib/queries/products";

const TITLE = "Product Lookup";
const INTRO = "Search the current LPPEPTIDE product list by product name, abbreviation, or code.";

export const metadata: Metadata = {
  title: TITLE,
  description: INTRO,
  alternates: { canonical: "/product-lookup/" },
};

export default async function ProductLookupPage() {
  const [catalog, categories] = await Promise.all([getCatalog(), getCategories()]);
  const names = new Map(categories.map((c) => [c.id, c.name]));
  const products: LookupProduct[] = catalog.map((p) => ({
    code: p.sku,
    slug: p.slug,
    name: p.name,
    amountMg: p.amountMg ?? 0,
    packageSize: p.packageSize || p.specification || p.subtitle || "10 vials / box",
    priceCents: catalogPriceCents(p),
    category: names.get(p.categoryId) ?? "LPPEPTIDE",
    aliases: [p.sku, ...p.tags],
  }));
  return (
    <CalculatorShell title={TITLE} intro={INTRO}>
      <ProductLookupTool products={products} />
    </CalculatorShell>
  );
}
