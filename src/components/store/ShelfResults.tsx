"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { matchesQuery } from "@/lib/catalog";
import { catalogPriceCents, type CatalogProduct } from "@/lib/product-utils";
import type { PickWarehouse } from "./AddToCart";
import { CatalogCard, CategoryCard } from "./ProductCards";

type Variant = "catalog" | "category";

const SORTS: Record<Variant, string[]> = {
  catalog: ["Recommended", "Name: A to Z", "Price: low to high"],
  category: ["Recommended", "Top rated", "Price: low to high"],
};

type Props = {
  variant: Variant;
  products: CatalogProduct[];
  categoryNames: Record<number, string>;
  warehouses: PickWarehouse[];
  /** Bold part of the results line, e.g. "All products". */
  heading: string;
  /** Text after the dash. "{count}" is replaced by the number of shown products. */
  summary: string;
  /** Left filter column (server-rendered); omitted = full-width grid. */
  aside?: ReactNode;
};

/** Toolbar + product grid. Sorting is client-side; the server-rendered order is "Recommended". */
export function ShelfResults({ query = "", ...props }: Props & { query?: string }) {
  const { variant, products, categoryNames, warehouses, heading, summary, aside } = props;
  const [sort, setSort] = useState(SORTS[variant][0]);

  const shown = useMemo(() => {
    const list = query ? products.filter((p) => matchesQuery(p, query)) : [...products];
    if (sort === "Name: A to Z") list.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "Price: low to high") list.sort((a, b) => catalogPriceCents(a) - catalogPriceCents(b));
    if (sort === "Top rated") list.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
    return list;
  }, [products, query, sort]);

  return (
    <>
      <section id="products" className="deal-toolbar" aria-label="Product controls">
        <div>
          <p className="results-copy">
            <strong>{query ? `Results for “${query}”` : heading}</strong> - {summary.replace("{count}", String(shown.length))}
          </p>
        </div>
        <div className="toolbar-actions">
          <label className="sort-select">
            <span>Sort</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              {SORTS[variant].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>
      <div className={aside ? "market-layout" : "market-layout-full market-layout"}>
        {aside}
        <section className={`products-grid grid-${variant}`} aria-label="Products">
          {shown.length === 0 && <div className="products-state">No products match “{query}”.</div>}
          {shown.map((p) =>
            variant === "catalog" ? (
              <CatalogCard key={p.id} product={p} categoryName={categoryNames[p.categoryId] ?? ""} warehouses={warehouses} />
            ) : (
              <CategoryCard key={p.id} product={p} warehouses={warehouses} />
            ),
          )}
        </section>
      </div>
    </>
  );
}

/** Same list, filtered by the header search (?q=). Render inside <Suspense> with <ShelfResults> as the fallback. */
export function ShelfResultsFromUrl(props: Props) {
  const query = (useSearchParams().get("q") ?? "").trim().slice(0, 200);
  return <ShelfResults {...props} query={query} />;
}
