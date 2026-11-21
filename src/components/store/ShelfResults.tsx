"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
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

/** Toolbar + product grid. Sorting is client-side; the server-rendered order is "Recommended". */
export function ShelfResults({ query = "", ...props }: Props & { query?: string }) {
  const { variant, products, categoryNames, warehouses, heading, summary, aside } = props;
  const { t } = useI18n();
  const [sort, setSort] = useState<Sort>(SORTS[variant][0]);

  const shown = useMemo(() => {
    const list = query ? products.filter((p) => matchesQuery(p, query)) : [...products];
    if (sort === "nameAZ") list.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "priceLowHigh") list.sort((a, b) => catalogPriceCents(a) - catalogPriceCents(b));
    if (sort === "topRated") list.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
    return list;
  }, [products, query, sort]);

  return (
    <>
      <section id="products" className="deal-toolbar" aria-label={t("shelf.productControls")}>
        <div>
          <p className="results-copy">
            <strong>{query ? t("shelf.resultsFor", { q: query }) : heading}</strong> - {summary.replace("{count}", String(shown.length))}
          </p>
        </div>
        <div className="toolbar-actions">
          <label className="sort-select">
            <span>{t("shelf.sort")}</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
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

/** Same list, filtered by the header search (?q=). Render inside <Suspense> with <ShelfResults> as the fallback. */
export function ShelfResultsFromUrl(props: Props) {
  const query = (useSearchParams().get("q") ?? "").trim().slice(0, 200);
  return <ShelfResults {...props} query={query} />;
}
