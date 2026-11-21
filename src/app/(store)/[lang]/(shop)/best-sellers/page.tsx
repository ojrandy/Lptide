import { localized } from "@/i18n/metadata";
import { Suspense } from "react";
import { ShelfHero, SubscribePromo } from "@/components/store/ShelfHero";
import { ShelfResults, ShelfResultsFromUrl } from "@/components/store/ShelfResults";
import { shelfStats } from "@/lib/catalog";
import { getCatalog } from "@/lib/queries/products";
import { getWarehouses } from "@/lib/queries/settings";

const DESCRIPTION = "Most requested factory-direct products, ranked from current catalog activity.";

export const generateMetadata = localized({
  title: "Best Sellers",
  description: DESCRIPTION,
  alternates: { canonical: "/best-sellers/" },
});

export default async function BestSellersPage() {
  const [catalog, warehouses] = await Promise.all([getCatalog(), getWarehouses()]);
  const products = catalog.filter((p) => p.tags.includes("Best Sellers")).slice(0, 10);
  const props = {
    variant: "category" as const,
    products,
    categoryNames: {},
    warehouses: warehouses.map((w) => ({ code: w.code, name: w.name, tagline: w.tagline })),
    heading: "Top 10",
    summary: "updated daily",
  };

  return (
    <div className="site-shell">
      <main>
        <ShelfHero tone="hero-tone-best-sellers" eyebrow="Backend category shelf" title="Best Sellers" text={DESCRIPTION} stats={shelfStats(products)} />
        <Suspense fallback={<ShelfResults {...props} />}>
          <ShelfResultsFromUrl {...props} />
        </Suspense>
        <SubscribePromo />
      </main>
    </div>
  );
}
