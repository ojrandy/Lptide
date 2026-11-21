"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { useI18n } from "@/i18n/client";
import type { MessageKey } from "@/i18n/translate";
import { matchesQuery } from "@/lib/catalog";
import { catalogPriceCents, type CatalogProduct } from "@/lib/product-utils";
import type { PickWarehouse } from "./AddToCart";
import { CatalogCard, CategoryCard } from "./ProductCards";

type Variant = "catalog" | "category";

type Sort = "recommended" | "nameAZ" | "priceLowHigh" | "topRated";
const SORTS: Record<Variant, Sort[]> = {
  catalog: ["recommended", "nameAZ", "priceLowHigh"],
  category: ["recommended", "topRated", "priceLowHigh"],
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

/**
 * Toolbar + product grid. Sorting is client-side; the server-rendered order is "Recommended".
 * The header search (?q=) is read by <QueryFromUrl> in its own small Suspense boundary, so the prerendered grid
 * hydrates once instead of being thrown away and re-rendered client-side (≈3,800 nodes on /catalog/).
 */
export function ShelfResults(props: Props) {
  const { variant, products, categoryNames, warehouses, heading, summary, aside } = props;
  const { t } = useI18n();
  const [sort, setSort] = useState<Sort>(SORTS[variant][0]);
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const list = query ? products.filter((p) => matchesQuery(p, query)) : [...products];
    if (sort === "nameAZ") list.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "priceLowHigh") list.sort((a, b) => catalogPriceCents(a) - catalogPriceCents(b));
    if (sort === "topRated") list.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
    return list;
  }, [products, query, sort]);

  return (
    <>
      <Suspense fallback={null}>
        <QueryFromUrl onQuery={setQuery} />
      </Suspense>
      <section id="products" className="deal-toolbar" aria-label={t("shelf.productControls")}>
        <div>
          <p className="results-copy">
            <strong>{query ? t("shelf.resultsFor", { q: query }) : heading}</strong> - {summary.replace("{count}", String(shown.length))}
          </p>
        </div>
        <div className="toolbar-actions">
          <label className="sort-select">
            <span>{t("shelf.sort")}</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label={t("shelf.sort")}>
              {SORTS[variant].map((s) => (
                <option key={s} value={s}>
                  {t(`shelf.${s}` as MessageKey)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>
      <div className={aside ? "market-layout" : "market-layout-full market-layout"}>
        {aside}
        <section className={`products-grid grid-${variant}`} aria-label={t("shelf.products")}>
          {/* Keeps heading order valid (h1 → h2 → card h3) where the filter column's h2 is not shown. */}
          <h2 className="sr-only">{t("shelf.products")}</h2>
          {shown.length === 0 && <div className="products-state">{t("shelf.noMatch", { q: query })}</div>}
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

/** Reports the header search (?q=) to the grid. Renders nothing. */
function QueryFromUrl({ onQuery }: { onQuery: (q: string) => void }) {
  const query = (useSearchParams().get("q") ?? "").trim().slice(0, 200);
  useEffect(() => onQuery(query), [query, onQuery]);
  return null;
}
