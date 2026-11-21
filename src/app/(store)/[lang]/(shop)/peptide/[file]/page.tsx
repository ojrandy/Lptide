import type { Metadata } from "next";
import { localeAlternates } from "@/i18n/metadata";
import Image from "next/image";
import { LocaleLink as Link } from "@/i18n/client";
import { notFound } from "next/navigation";
import { Fragment, Suspense } from "react";
import { DetailTabs } from "@/components/store/product/DetailTabs";
import { Gallery } from "@/components/store/product/Gallery";
import { BuyBox, MobilePurchaseBar, PurchaseProvider, WarehouseFromUrl, type PurchaseWarehouse } from "@/components/store/product/Purchase";
import { AskQuestion, WriteReview } from "@/components/store/product/ReviewForms";
import { NUMBER_LOCALE, type Locale } from "@/i18n/config";
import { getI18n, type I18n } from "@/i18n/server";
import { warehouseDispatch } from "@/content/home";
import { countryOptions } from "@/content/countries";
import { tagStyle } from "@/content/tag-styles";
import { formatCount, stars } from "@/lib/catalog";
import { formatCents } from "@/lib/money";
import { catalogPriceCents, inStockAnywhere, productHref, specWithBox, type CatalogProduct } from "@/lib/product-utils";
import { getCatalog, getCategories, getProduct, getProductTranslation, withTranslation } from "@/lib/queries/products";
import { getWarehouses } from "@/lib/queries/settings";
import "@/styles/live/product.css";
import "@/styles/live/shipping-countries.css";

// Unknown params must return a real 404 status, so the lookup runs before streaming starts (outside <Suspense>).
// Known params are prerendered by generateStaticParams, so navigation stays fast.
export const instant = false;

// /peptide/{slug}.html — the live product URL. /peptide/{slug} (no .html) is redirected here by src/proxy.ts.

const SITE_URL = process.env.SITE_URL ?? "https://lppeptide.co";

export async function generateStaticParams() {
  return (await getCatalog()).map((p) => ({ file: `${p.slug}.html` }));
}

const slugOf = (file: string) => (file.endsWith(".html") ? file.slice(0, -5) : null);

/** The product, with its es/pt name/subtitle/description override when one exists (V2-5). */
async function load(file: string, lang: string) {
  const slug = slugOf(file);
  const p = slug ? await getProduct(slug) : null;
  return p ? withTranslation(p, await getProductTranslation(p.id, lang)) : null;
}

const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();

export async function generateMetadata({ params }: PageProps<"/[lang]/peptide/[file]">): Promise<Metadata> {
  const { file, lang } = await params;
  const p = await load(file, lang);
  if (!p) return {};
  const description = oneLine(p.description) || `${p.name} - SKU ${p.sku} - ${p.specification}`;
  return {
    title: `${p.name} (${p.sku})`,
    description,
    alternates: localeAlternates((await params).lang, productHref(p.slug)),
    openGraph: { type: "website", title: `${p.name} (${p.sku}) | LPPEPTIDE`, description, images: p.images.slice(0, 1) },
  };
}

export default async function ProductPage({ params }: PageProps<"/[lang]/peptide/[file]">) {
  const { file, lang } = await params;
  const p = await load(file, lang);
  if (!p) notFound();

  const [warehouses, catalog, categories, i18n] = await Promise.all([getWarehouses(), getCatalog(), getCategories(), getI18n()]);
  const { t, href } = i18n;
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

  // Related products, same rule as the live bundle: every other product with an image and a price (not the same
  // SKU), ordered by sort then name (live breaks ties by sales, which we don't store; for the captured data the
  // name gives the same order), one per SKU; the first 4 are "Often paired", the next 4 "More picks".
  const seen = new Set<string>([p.sku.trim().toUpperCase()]);
  const related = catalog
    .filter((x) => x.id !== p.id && x.image && catalogPriceCents(x) > 0)
    .sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name))
    .filter((x) => {
      const key = x.sku.trim().toUpperCase() || x.slug;
      return seen.has(key) ? false : (seen.add(key), true);
    });
  const paired = related.slice(0, 4);
  const more = related.slice(4, 8);
  const categoryNames = new Map(categories.map((c) => [c.id, c.name]));

  // Tabs: content sections, with Reviews and Q&A placed before the "About" sections (live order).
  const aboutAt = p.sections.findIndex((s) => s.key.startsWith("about"));
  const split = aboutAt === -1 ? p.sections.length : aboutAt;
  const tabs = [
    ...p.sections.slice(0, split).map((s) => ({ id: s.key, label: s.label })),
    { id: "reviews", label: t("product.reviewsTab", { count: formatCount(p.reviewCount) }) },
    { id: "qa", label: t("product.qaTab", { count: formatCount(p.qaCount) }) },
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
          <nav className="detail-breadcrumb" aria-label={t("shelf.breadcrumb")}>
            <Link href={href("/catalog/")}>{t("common.home")}</Link>
            <Link href={href("/catalog/")}>LPPEPTIDE</Link>
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
                  <div className="rating-line detail-rating-line" aria-label={t("card.productRating")}>
                    {p.rating > 0 && (
                      <>
                        <span aria-hidden="true">{stars(p.rating)}</span>
                        <strong>{p.rating.toFixed(1)}</strong>
                        <a href="#reviews">{t("product.ratings", { count: formatCount(p.reviewCount) })}</a>
                      </>
                    )}
                    {p.qaCount > 0 && <a href="#qa">{t("product.answered", { count: formatCount(p.qaCount) })}</a>}
                    <strong className="catalog-stock-summary">
                      <span className="catalog-code">{p.sku}</span>
                      <span className="catalog-label">{t("card.sku")}</span>
                    </strong>
                  </div>
                  {p.tags.length > 0 && (
                    <div className="shipping-line" aria-label={t("card.productTags")}>
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
                <h2 id="glance-heading">{t("product.atAGlance")}</h2>
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
                        <Link href={href(`${p.coaUrl.replace(/\/$/, "")}/`)} target="_blank">
                          {t("product.viewCertificate")}
                        </Link>
                      </dd>
                    </div>
                  )}
                </dl>
              </section>
            </div>

            <aside className="purchase-column" aria-label={t("product.purchaseOptions")}>
              <BuyBox specification={specWithBox(p.specification, p.packageSize)} />
            </aside>
          </section>

          <section className="detail-longform" aria-label="Product details">
            <DetailTabs tabs={tabs} />
            {p.sections.slice(0, split).map((s, i) => (
              <SectionPanel key={s.key} section={s} showTitle={i > 0} />
            ))}
            <ReviewsPanel product={p} i18n={i18n} />
            <QaPanel product={p} i18n={i18n} />
            {p.sections.slice(split).map((s) => (
              <SectionPanel key={s.key} section={s} showTitle />
            ))}
            <RelatedPanel id="frequently-bought-together" title={t("product.oftenPaired")} items={paired} categoryNames={categoryNames} i18n={i18n} />
            <RelatedPanel id="searched-also-bought" title={t("product.morePicks")} items={more} categoryNames={categoryNames} i18n={i18n} />
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

const longDate = (iso: string, locale: Locale) => {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(NUMBER_LOCALE[locale], { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
};

function ReviewsPanel({ product: p, i18n: { t, locale } }: { product: Product; i18n: I18n }) {
  const label = t("product.reviewsTab", { count: formatCount(p.reviewCount) });
  return (
    <article id="reviews" className="content-panel reviews-panel">
      <div className="section-title">
        <span>{label}</span>
      </div>
      <div className="panel-body">
        <section className="review-summary" aria-label={label}>
          <div>
            <strong>{p.rating.toFixed(1)} / 5</strong>
            <span aria-hidden="true">{stars(p.rating)}</span>
            <p>{t("product.basedOn", { count: formatCount(p.reviewCount) })}</p>
          </div>
          {p.ratingBreakdown.length > 0 && (
            <div className="rating-bars">
              {p.ratingBreakdown.map((r) => (
                <p key={r.label}>
                  <span>{r.label}</span>
                  <i>
                    <b style={{ width: `${Math.max(0, Math.min(100, r.percent))}%` }} />
                  </i>
                  <small>{t("product.reviewsCount", { count: formatCount(r.count), percent: r.percent })}</small>
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
                <strong>{r.authorName}</strong> - {longDate(r.date, locale)}
                {r.verified && <span>{r.verifiedLabel || t("product.verifiedBuyer")}</span>}
              </p>
              <span className="review-stars" aria-hidden="true">
                {stars(r.rating)}
              </span>
              {r.title && <h3>{r.title}</h3>}
              <p>{r.content}</p>
            </div>
          </article>
        ))}
        <div className="lp-panel-action">
          <WriteReview productId={p.id} />
        </div>
      </div>
    </article>
  );
}

function QaPanel({ product: p, i18n: { t } }: { product: Product; i18n: I18n }) {
  return (
    <article id="qa" className="content-panel">
      <div className="section-title">
        <span>{t("product.qaTitle", { count: formatCount(p.qaCount) })}</span>
      </div>
      <div className="panel-body">
        <div className="qa-list">
          {p.qa.map((q, i) => (
            <section key={i} className="qa-item">
              <h2>Q: {q.question}</h2>
              <p>A: {q.answer}</p>
            </section>
          ))}
          {p.qa.length === 0 && <p>{t("reviews.noQuestions")}</p>}
        </div>
        <div className="lp-panel-action">
          <AskQuestion productId={p.id} />
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
  i18n: { t, href },
}: {
  id: string;
  title: string;
  items: CatalogProduct[];
  categoryNames: Map<number, string>;
  i18n: I18n;
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
            <Link key={x.id} href={href(productHref(x.slug))} className="related-card">
              <div className="related-card-media">
                {/* height:auto lets the live CSS aspect-ratio (4/3, cover) apply instead of the 300px height attribute. */}
                {x.image && <Image src={x.image} alt={x.name} width={300} height={300} sizes="180px" style={{ height: "auto" }} />}
                {!inStock && <span className="related-stock-overlay">{t("common.outStockShort")}</span>}
              </div>
              <strong>{category ? `${x.name} - ${category}` : x.name}</strong>
              <small>
                {category && `${category} - `}
                {t("product.rating", { rating: x.rating.toFixed(1) })}
              </small>
              <b>{formatCents(catalogPriceCents(x))}</b>
              {/* Live: out-of-stock cards show only the OUT STOCK overlay. */}
              {inStock && <span className="related-stock-label">{t("common.inStock")}</span>}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

