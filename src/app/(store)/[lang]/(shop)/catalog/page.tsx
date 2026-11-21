import type { Metadata } from "next";
import { localeAlternates } from "@/i18n/metadata";
import { LocaleLink as Link } from "@/i18n/client";
import { Suspense } from "react";
import { ShelfResults, ShelfResultsFromUrl } from "@/components/store/ShelfResults";
import { catalogDescription, shelfStats } from "@/lib/catalog";
import { getCatalog, getCategories } from "@/lib/queries/products";
import { getWarehouses } from "@/lib/queries/settings";

async function load() {
  const [products, categories, warehouses] = await Promise.all([getCatalog(), getCategories(), getWarehouses()]);
  return { products, categories, warehouses };
}

export async function generateMetadata({ params }: PageProps<"/[lang]/catalog">): Promise<Metadata> {
  const { products } = await load();
  const s = shelfStats(products);
  return {
    title: "All LPPEPTIDE",
    description: catalogDescription(s.count, s.coaCount),
    alternates: localeAlternates((await params).lang, "/catalog/"),
  };
}

export default async function CatalogPage() {
  const { products, categories, warehouses } = await load();
  const s = shelfStats(products);
  const props = {
    variant: "catalog" as const,
    products,
    categoryNames: Object.fromEntries(categories.map((c) => [c.id, c.name])),
    warehouses: warehouses.map((w) => ({ code: w.code, name: w.name, tagline: w.tagline })),
    heading: "All products",
    summary: "{count} catalog products",
    aside: (
      <aside id="filters" className="filter-panel" aria-label="Product filters">
        <h2>Filter</h2>
        <div className="filter-group">
          <h3>Catalog category</h3>
          {categories.map((c) => (
            <Link key={c.id} href={`/category/${c.slug}/`} className="filter-option filter-link">
              <span className="filter-check" aria-hidden="true" />
              <span>{c.name}</span>
              <small>{products.filter((p) => p.categoryId === c.id).length}</small>
            </Link>
          ))}
        </div>
        <div className="trust-box">
          <strong>Research use only</strong>
          <p>Pricing and specifications are sourced from the LPPEPTIDE catalog.</p>
        </div>
      </aside>
    ),
  };

  return (
    <div className="site-shell">
      <main>
        <section className="hero-section hero-catalog" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">2026 LPPEPTIDE catalog</p>
            <h1 id="hero-title">Research catalog, ready to source</h1>
            <p className="hero-text">{catalogDescription(s.count, s.coaCount)}</p>
          </div>
        </section>
        <Suspense fallback={<ShelfResults {...props} />}>
          <ShelfResultsFromUrl {...props} />
        </Suspense>
        <section className="promo-band" aria-label="Subscribe promotion">
          <div>
            <p className="section-kicker">Catalog support</p>
            <h2>Browse LPPEPTIDE with consistent product detail</h2>
            <p>Use category filters, stock signals, and verified product cards to move through the catalog quickly.</p>
          </div>
          <a href="#products">View LPPEPTIDE catalog</a>
        </section>
      </main>
    </div>
  );
}
