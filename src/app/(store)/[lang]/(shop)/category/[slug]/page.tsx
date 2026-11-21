import type { Metadata } from "next";
import { localeAlternates } from "@/i18n/metadata";
import { LocaleLink as Link } from "@/i18n/client";
import { notFound } from "next/navigation";
import Markdown, { type Components } from "react-markdown";
import { ShelfHero, SubscribePromo } from "@/components/store/ShelfHero";
import { ShelfResults } from "@/components/store/ShelfResults";
import { categoryDescription, heroTone, shelfStats } from "@/lib/catalog";
import { getCatalog, getCategories } from "@/lib/queries/products";
import { getWarehouses } from "@/lib/queries/settings";

// Unknown params must return a real 404 status, so the lookup runs before streaming starts (outside <Suspense>).
// Known params are prerendered by generateStaticParams, so navigation stays fast.
export const instant = false;

// /category/{slug}/ — the "-and-" spelling used by live catalog links (weight-loss-and-metabolic)
// is redirected to the canonical slug in src/proxy.ts.

export async function generateStaticParams() {
  return (await getCategories()).map((c) => ({ slug: c.slug }));
}

async function load(slug: string) {
  const [categories, catalog, warehouses] = await Promise.all([getCategories(), getCatalog(), getWarehouses()]);
  const category = categories.find((c) => c.slug === slug);
  if (!category) return null;
  const products = catalog.filter((p) => p.categoryId === category.id);
  return { category, products, warehouses, stats: shelfStats(products) };
}

export async function generateMetadata({ params }: PageProps<"/[lang]/category/[slug]">): Promise<Metadata> {
  const data = await load((await params).slug);
  if (!data) return {};
  const { category, stats } = data;
  return {
    title: category.name,
    description: categoryDescription(category.name, stats.count, stats.coaCount),
    alternates: localeAlternates((await params).lang, `/category/${category.slug}/`),
  };
}

/** Intro links point at /peptide/{slug}; send them straight to the canonical .html URL. */
const introComponents: Components = {
  a: ({ href = "", children }) => {
    const url = /^\/peptide\/[^/.]+$/.test(href) ? `${href}.html` : href;
    return url.startsWith("/") ? (
      <Link href={url} className="category-intro-link">
        {children}
      </Link>
    ) : (
      <a href={url} className="category-intro-link" rel="noopener noreferrer" target="_blank">
        {children}
      </a>
    );
  },
  blockquote: ({ children }) => <div className="category-intro-block category-intro-callout">{children}</div>,
  p: ({ children }) => <p className="category-intro-paragraph">{children}</p>,
  h2: ({ children }) => (
    <div className="category-intro-block">
      <h2 className="category-intro-heading">{children}</h2>
    </div>
  ),
  h3: ({ children }) => (
    <div className="category-intro-block">
      <h3 className="category-intro-heading">{children}</h3>
    </div>
  ),
  ul: ({ children }) => (
    <div className="category-intro-block">
      <ul className="category-intro-list">{children}</ul>
    </div>
  ),
};

export default async function CategoryPage({ params }: PageProps<"/[lang]/category/[slug]">) {
  const data = await load((await params).slug);
  if (!data) notFound();
  const { category, products, warehouses, stats } = data;

  const props = {
    variant: "category" as const,
    products,
    categoryNames: { [category.id]: category.name },
    warehouses: warehouses.map((w) => ({ code: w.code, name: w.name, tagline: w.tagline })),
    heading: category.name,
    summary: "{count} products",
    aside: (
      <aside id="filters" className="filter-panel" aria-label="Product filters">
        <h2>Refine results</h2>
        <div className="filter-group">
          <h3>LPPEPTIDE</h3>
          <Link href="/catalog/" className="filter-option filter-link active">
            <span className="filter-check checked" aria-hidden="true" />
            <span>{category.name}</span>
            <small>{stats.count}</small>
          </Link>
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
        <ShelfHero
          tone={heroTone(category.slug)}
          eyebrow="PDF catalog shelf"
          title={category.heroTitle || category.name}
          text={categoryDescription(category.name, stats.count, stats.coaCount)}
          stats={stats}
        />
        <ShelfResults {...props} />
        {category.introMd && (
          <section className="category-intro" aria-label="Category guide">
            <Markdown components={introComponents}>{category.introMd}</Markdown>
          </section>
        )}
        <SubscribePromo />
      </main>
    </div>
  );
}

