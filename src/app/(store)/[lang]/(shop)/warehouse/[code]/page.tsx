import type { Metadata } from "next";
import { localeAlternates } from "@/i18n/metadata";
import Image from "next/image";
import { LocaleLink as Link } from "@/i18n/client";
import { notFound } from "next/navigation";
import { WarehouseAddButton } from "@/components/store/AddToCart";
import { formatCents } from "@/lib/money";
import { productHref } from "@/lib/product-utils";
import { getCatalog, getCategories } from "@/lib/queries/products";
import { getWarehouses } from "@/lib/queries/settings";
import "@/styles/live/warehouse.css";

// Unknown params must return a real 404 status, so the lookup runs before streaming starts (outside <Suspense>).
// Known params are prerendered by generateStaticParams, so navigation stays fast.
export const instant = false;

// /warehouse/cnfc/ · /usfc/ · /ausfc/ — every product sold in this warehouse, grouped by category.

export async function generateStaticParams() {
  return (await getWarehouses()).map((w) => ({ code: w.code.toLowerCase() }));
}

async function findWarehouse(code: string) {
  return (await getWarehouses()).find((w) => w.code.toLowerCase() === code.toLowerCase()) ?? null;
}

const intro = (name: string) =>
  `Dispatches from ${name} to destinations enabled for this warehouse. Stock and delivery eligibility are checked again before an order is created.`;

export async function generateMetadata({ params }: PageProps<"/[lang]/warehouse/[code]">): Promise<Metadata> {
  const w = await findWarehouse((await params).code);
  if (!w) return {};
  return {
    title: w.name,
    description: intro(w.name),
    alternates: localeAlternates((await params).lang, `/warehouse/${w.code.toLowerCase()}/`),
  };
}

export default async function WarehousePage({ params }: PageProps<"/[lang]/warehouse/[code]">) {
  const { code } = await params;
  const warehouse = await findWarehouse(code);
  if (!warehouse) notFound();

  const [catalog, categories] = await Promise.all([getCatalog(), getCategories()]);
  const pick = { code: warehouse.code, name: warehouse.name, tagline: warehouse.tagline };
  const shelves = categories
    .map((c) => ({
      category: c,
      items: catalog
        .filter((p) => p.categoryId === c.id)
        .flatMap((p) => {
          const price = p.prices.find((x) => x.warehouseCode === warehouse.code);
          return price ? [{ p, price }] : [];
        }),
    }))
    .filter((s) => s.items.length > 0);

  return (
    <div className="warehouse-page">
      <main>
        <div className="warehouse-breadcrumb">
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          <span>{warehouse.name}</span>
        </div>
        <section className="warehouse-intro">
          <span className="warehouse-kicker">Warehouse</span>
          <h1>{warehouse.name}</h1>
          <p>{intro(warehouse.name)}</p>
        </section>
        <section className="warehouse-catalog" aria-labelledby="catalog-title">
          <h2 id="catalog-title" className="sr-only">
            Warehouse product catalog
          </h2>
          <div className="warehouse-category-list">
            {shelves.map(({ category, items }) => (
              <section key={category.id} id={`category-${category.slug}`} className="warehouse-category" aria-label={category.name}>
                <header className="warehouse-category-heading">
                  <h3>{category.name}</h3>
                </header>
                <div className="warehouse-product-grid">
                  {items.map(({ p, price }) => (
                    <article key={p.id} className="warehouse-product-card">
                      <Link href={`${productHref(p.slug)}?warehouse=${warehouse.code}`} className="warehouse-product-link">
                        <div className="warehouse-product-media">
                          {p.image ? (
                            <Image src={p.image} alt={p.name} width={400} height={400} sizes="(max-width: 760px) 50vw, 240px" />
                          ) : (
                            <span className="warehouse-image-unavailable">Image unavailable</span>
                          )}
                          <span className={`warehouse-stock ${price.inStock ? "is-in_stock" : "is-out_of_stock"}`}>
                            {price.inStock ? "In stock" : "OUT STOCK"}
                          </span>
                        </div>
                        <h4>{p.name}</h4>
                        <div className="warehouse-product-price">
                          <strong className="warehouse-product-current-price is-sale" data-price-role="sale">
                            {formatCents(price.priceCents)}
                          </strong>
                          {price.listCents > price.priceCents && (
                            <del
                              className="warehouse-product-old-price"
                              data-price-role="compare-at"
                              aria-label={`Original price ${formatCents(price.listCents)}`}
                            >
                              {formatCents(price.listCents)}
                            </del>
                          )}
                        </div>
                      </Link>
                      <WarehouseAddButton productId={p.id} warehouse={pick} inStock={price.inStock} />
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

