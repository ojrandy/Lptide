import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment, Suspense } from "react";
import { DetailTabs } from "@/components/store/product/DetailTabs";
import { Gallery } from "@/components/store/product/Gallery";
import { BuyBox, MobilePurchaseBar, PurchaseProvider, WarehouseFromUrl, type PurchaseWarehouse } from "@/components/store/product/Purchase";
import { warehouseDispatch } from "@/content/home";
import { countryOptions } from "@/content/countries";
import { tagStyle } from "@/content/tag-styles";
import { formatCount, stars } from "@/lib/catalog";
import { formatCents } from "@/lib/money";
import { catalogPriceCents, inStockAnywhere, productHref, type CatalogProduct } from "@/lib/product-utils";
import { getCatalog, getCategories, getProduct } from "@/lib/queries/products";
import { getWarehouses } from "@/lib/queries/settings";
import "@/styles/live/product.css";
import "@/styles/live/shipping-countries.css";

// Unknown params must return a real 404 status, so the lookup runs before streaming starts (outside <Suspense>).
// Known params are prerendered by generateStaticParams, so navigation stays fast.
export const instant = false;

// /peptide/{slug}.html — the live product URL. /peptide/{slug} (no .html) is redirected here by src/proxy.ts.

const SITE_URL = process.env.SITE_URL ?? "https://lppeptide.com";

export async function generateStaticParams() {
  return (await getCatalog()).map((p) => ({ file: `${p.slug}.html` }));
}

const slugOf = (file: string) => (file.endsWith(".html") ? file.slice(0, -5) : null);

async function load(file: string) {
  const slug = slugOf(file);
  return slug ? getProduct(slug) : null;
}

const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();

export async function generateMetadata({ params }: PageProps<"/peptide/[file]">): Promise<Metadata> {
  const p = await load((await params).file);
  if (!p) return {};
  const description = oneLine(p.description) || `${p.name} - SKU ${p.sku} - ${p.specification}`;
  return {
    title: `${p.name} (${p.sku})`,
    description,
    alternates: { canonical: productHref(p.slug) },
    openGraph: { type: "website", title: `${p.name} (${p.sku}) | LPPEPTIDE`, description, images: p.images.slice(0, 1) },
  };
}

export default async function ProductPage({ params }: PageProps<"/peptide/[file]">) {
  const p = await load((await params).file);
  if (!p) notFound();

  const [warehouses, catalog, categories] = await Promise.all([getWarehouses(), getCatalog(), getCategories()]);
  const catalogCents = catalogPriceCents(p);

  const purchaseWarehouses: PurchaseWarehouse[] = warehouses.map((w) => {
    const price = p.prices.find((x) => x.warehouseCode === w.code);
    return {
      code: w.code,
      name: w.name,
      dispatch: warehouseDispatch[w.code] ?? w.tagline,
      countries: countryOptions(w.countries),
      price: price ? { priceCents: price.priceCents, listCents: price.listCents, inStock: price.inStock } : null,
    };
  });

  // Related products, same rule as the live page: same category but another compound, then the next
  // products in catalog order (skipping the same compound).
  const family = (x: { shortName: string; name: string }) => (x.shortName || x.name).toLowerCase();
  const others = catalog.filter((x) => x.id !== p.id && family(x) !== family(p));
  const paired = others.filter((x) => x.categoryId === p.categoryId).slice(0, 4);
  const index = catalog.findIndex((x) => x.id === p.id);
  const rotated = [...catalog.slice(index + 1), ...catalog.slice(0, index)];
  const more = rotated.filter((x) => others.includes(x) && !paired.includes(x)).slice(0, 4);
  const categoryNames = new Map(categories.map((c) => [c.id, c.name]));

  // Tabs: content sections, with Reviews and Q&A placed before the "About" sections (live order).
  const aboutAt = p.sections.findIndex((s) => s.key.startsWith("about"));
  const split = aboutAt === -1 ? p.sections.length : aboutAt;
  const tabs = [
    ...p.sections.slice(0, split).map((s) => ({ id: s.key, label: s.label })),
    { id: "reviews", label: `Reviews - ${formatCount(p.reviewCount)}` },
    { id: "qa", label: `Q&A - ${formatCount(p.qaCount)}` },
    ...p.sections.slice(split).map((s) => ({ id: s.key, label: s.label })),
  ];

  const sale = p.prices.map((x) => x.priceCents);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    sku: p.sku,
    description: oneLine(p.description),
    image: p.images.map((i) => `${SITE_URL}${i}`),
    brand: { "@type": "Brand", name: "LPPEPTIDE" },
    category: p.category.name,
    ...(p.rating > 0 && p.reviewCount > 0
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: p.rating, reviewCount: p.reviewCount } }
      : {}),
    ...(sale.length
      ? {
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "USD",
            lowPrice: (Math.min(...sale) / 100).toFixed(2),
            highPrice: (Math.max(...sale) / 100).toFixed(2),
            offerCount: sale.length,
            availability: inStockAnywhere(p) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            url: `${SITE_URL}${productHref(p.slug)}`,
          },
        }
      : {}),
  };

  return (
    <div className="site-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <PurchaseProvider productId={p.id} catalogCents={catalogCents} warehouses={purchaseWarehouses}>
        <Suspense fallback={null}>
          <WarehouseFromUrl />
        </Suspense>
        <main className="peptide-detail-page">
          <nav className="detail-breadcrumb" aria-label="Breadcrumb">
            <Link href="/catalog/">Home</Link>
            <Link href="/catalog/">LPPEPTIDE</Link>
            <span>{p.name}</span>
          </nav>

          <section className="product-detail-layout">
            <div className="product-main-column">
              <section className="gallery-summary-grid" aria-label="Product gallery and summary">
                <Gallery images={p.images} alt={p.name} />
                <section className="product-summary">
                  <h1>
                    {p.name} {p.subtitle && <span>{p.subtitle}</span>}
                  </h1>
                  {p.description && <p className="source-copy">{p.description}</p>}
                  <div className="rating-line detail-rating-line" aria-label="Product rating">
                    {p.rating > 0 && (
                      <>
                        <span aria-hidden="true">{stars(p.rating)}</span>
                        <strong>{p.rating.toFixed(1)}</strong>
                        <a href="#reviews">({formatCount(p.reviewCount)} ratings)</a>
                      </>
                    )}
                    {p.qaCount > 0 && <a href="#qa">{formatCount(p.qaCount)} answered questions</a>}
                    <strong className="catalog-stock-summary">
                      <span className="catalog-code">{p.sku}</span>
                      <span className="catalog-label">SKU:</span>
                    </strong>
                  </div>
                  {p.tags.length > 0 && (
                    <div className="shipping-line" aria-label="Product tags">
                      {p.tags.map((t) => (
                        <span key={t} style={tagStyle(t)}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </section>
              </section>

              <section className="glance-card" aria-labelledby="glance-heading">
                <h2 id="glance-heading">At a glance</h2>
                <dl>
                  {p.glance.map((g, i) => (
                    <div key={i}>
                      <dt>{g.label}</dt>
                      <dd>
                        {g.linkUrl ? (
                          <a href={g.linkUrl} target="_blank" rel="noopener noreferrer">
                            {g.value}
                          </a>
                        ) : (
                          <span>{g.value}</span>
                        )}
                      </dd>
                    </div>
                  ))}
                  {p.coaUrl && (
                    <div>
                      <dt>COA</dt>
                      <dd>
                        <Link href={`${p.coaUrl.replace(/\/$/, "")}/`} target="_blank">
                          View certificate
                        </Link>
                      </dd>
                    </div>
                  )}
                </dl>
              </section>
            </div>

            <aside className="purchase-column" aria-label="Purchase options">
              <BuyBox specification={p.specification} />
            </aside>
          </section>

          <section className="detail-longform" aria-label="Product details">
            <DetailTabs tabs={tabs} />
            {p.sections.slice(0, split).map((s, i) => (
              <SectionPanel key={s.key} section={s} showTitle={i > 0} />
            ))}
            <ReviewsPanel product={p} />
            <QaPanel product={p} />
            {p.sections.slice(split).map((s) => (
              <SectionPanel key={s.key} section={s} showTitle />
            ))}
            <RelatedPanel id="frequently-bought-together" title="Often paired from LPPEPTIDE" items={paired} categoryNames={categoryNames} />
            <RelatedPanel id="searched-also-bought" title="More factory-direct research picks" items={more} categoryNames={categoryNames} />
          </section>

          <MobilePurchaseBar />
        </main>
      </PurchaseProvider>
    </div>
  );
}

type Product = NonNullable<Awaited<ReturnType<typeof getProduct>>>;

/** Section text: blank lines separate paragraphs; a paragraph of "- " lines is a list (as on the live page). */
function Body({ text }: { text: string }) {
  return text
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk, i) => {
      const lines = chunk.split("\n");
      if (lines.every((l) => /^\s*-\s+/.test(l)))
        return (
          <ul key={i}>
            {lines.map((l, j) => (
              <li key={j}>
                <span>{l.replace(/^\s*-\s+/, "")}</span>
              </li>
            ))}
          </ul>
        );
      return (
        <p key={i}>
          <span>{chunk}</span>
        </p>
      );
    });
}

function SectionPanel({ section, showTitle }: { section: Product["sections"][number]; showTitle: boolean }) {
  return (
    <article id={section.key} className="content-panel">
      {showTitle && (
        <div className="section-title">
          <span>{section.label}</span>
        </div>
      )}
      <div className="panel-body">
        {section.blocks.map((b, i) => (
          <Fragment key={i}>
            {b.heading && <h2>{b.heading}</h2>}
            {b.imageUrl && <Image src={b.imageUrl} alt={b.heading || section.label} width={800} height={600} sizes="(max-width: 760px) 100vw, 760px" />}
            <Body text={b.body} />
            {b.links && b.links.length > 0 && (
              <ul>
                {b.links.map((l) => (
                  <li key={l.url}>
                    <a href={l.url} target="_blank" rel="noopener noreferrer">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Fragment>
        ))}
      </div>
    </article>
  );
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

const longDate = (iso: string) => {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
};

function ReviewsPanel({ product: p }: { product: Product }) {
  const label = `Reviews - ${formatCount(p.reviewCount)}`;
  return (
    <article id="reviews" className="content-panel reviews-panel">
      <div className="section-title">
        <span>{label}</span>
      </div>
      <div className="panel-body">
        <section className="review-summary" aria-label="Review summary">
          <div>
            <strong>{p.rating.toFixed(1)} / 5</strong>
            <span aria-hidden="true">{stars(p.rating)}</span>
            <p>Based on {formatCount(p.reviewCount)} verified buyers</p>
          </div>
          {p.ratingBreakdown.length > 0 && (
            <div className="rating-bars">
              {p.ratingBreakdown.map((r) => (
                <p key={r.label}>
                  <span>{r.label}</span>
                  <i>
                    <b style={{ width: `${Math.max(0, Math.min(100, r.percent))}%` }} />
                  </i>
                  <small>
                    {formatCount(r.count)} reviews · {r.percent}%
                  </small>
                </p>
              ))}
            </div>
          )}
        </section>
        {p.reviews.map((r, i) => (
          <article key={i} className="review-card">
            <div className="review-avatar">{initials(r.authorName)}</div>
            <div>
              <p className="review-meta">
                <strong>{r.authorName}</strong> - {longDate(r.date)}
                <span>Verified Buyer</span>
              </p>
              <span className="review-stars" aria-hidden="true">
                {stars(r.rating)}
              </span>
              {r.title && <h3>{r.title}</h3>}
              <p>{r.content}</p>
            </div>
          </article>
        ))}
      </div>
    </article>
  );
}

function QaPanel({ product: p }: { product: Product }) {
  return (
    <article id="qa" className="content-panel">
      <div className="section-title">
        <span>Q&amp;A • {formatCount(p.qaCount)}</span>
      </div>
      <div className="panel-body">
        <div className="qa-list">
          {p.qa.map((q, i) => (
            <section key={i} className="qa-item">
              <h2>Q: {q.question}</h2>
              <p>A: {q.answer}</p>
            </section>
          ))}
        </div>
      </div>
    </article>
  );
}

function RelatedPanel({
  id,
  title,
  items,
  categoryNames,
}: {
  id: string;
  title: string;
  items: CatalogProduct[];
  categoryNames: Map<number, string>;
}) {
  if (items.length === 0) return null;
  return (
    <section id={id} className="related-panel" aria-labelledby={`${id}-heading`}>
      <header>
        <h2 id={`${id}-heading`}>{title}</h2>
      </header>
      <div className="related-grid">
        {items.map((x) => {
          const category = categoryNames.get(x.categoryId) ?? "";
          const inStock = inStockAnywhere(x);
          return (
            <Link key={x.id} href={productHref(x.slug)} className="related-card">
              <div className="related-card-media">
                {x.image && <Image src={x.image} alt={x.name} width={300} height={300} sizes="180px" />}
                {!inStock && <span className="related-stock-overlay">OUT STOCK</span>}
              </div>
              <strong>{category ? `${x.name} - ${category}` : x.name}</strong>
              <small>
                {category && `${category} - `}
                {x.rating.toFixed(1)} rating
              </small>
              <b>{formatCents(catalogPriceCents(x))}</b>
              <span className="related-stock-label">{inStock ? "In stock" : "Out of stock"}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

