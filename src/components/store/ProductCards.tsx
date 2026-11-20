import Image from "next/image";
import Link from "next/link";
import { tagStyle } from "@/content/tag-styles";
import { formatCount, stars } from "@/lib/catalog";
import { formatCents } from "@/lib/money";
import { catalogPriceCents, inStockAnywhere, productHref, type CatalogProduct } from "@/lib/product-utils";
import { ChooseWarehouseButtons, type PickWarehouse } from "./AddToCart";

// Card markup mirrors the live catalog ("card-catalog") and category/best-seller ("card-category") cards.

const imageSizes = "(max-width: 760px) 40vw, 220px";

export function CatalogCard({
  product: p,
  categoryName,
  warehouses,
}: {
  product: CatalogProduct;
  categoryName: string;
  warehouses: PickWarehouse[];
}) {
  const price = formatCents(catalogPriceCents(p));
  const href = productHref(p.slug);
  return (
    <div className="catalog-product-row">
      <article className="product-card card-catalog">
        <Link href={href} className="product-card-detail-link" aria-label={`View ${p.name}`} />
        <div className="product-media">
          {p.image && <Image src={p.image} alt={p.name} width={400} height={400} sizes={imageSizes} />}
        </div>
        <div className="product-body">
          <p className="brand-name catalog-stock-line" aria-label="Catalog stock">
            <span className="product-catalog-code">{p.sku}</span>
            <span className="product-catalog-label">SKU:</span>
            <span className="product-catalog-count">{inStockAnywhere(p) ? "In stock" : "OUT STOCK"}</span>
          </p>
          <h3>{p.name}</h3>
          <Rating product={p} className="rating-row product-summary-rating" />
          <p className="product-description">{p.description}</p>
          <Tags tags={p.tags} className="product-tag-row" />
          <div className="price-row">
            <strong>{price}</strong>
          </div>
          <p className="timer">2026 LPPEPTIDE catalog</p>
          <div className="card-actions">
            <Link href={href} className="add-button">
              View product
            </Link>
          </div>
        </div>
      </article>
      <div className="catalog-direct-card">
        <div className="offer-source-box">{p.sku}</div>
        <strong>{p.subtitle || p.specification}</strong>
        <ChooseWarehouseButtons
          productId={p.id}
          productName={p.name}
          prices={p.prices}
          warehouses={warehouses}
          classNames={{ wrapper: "offer-actions" }}
        />
      </div>
      <div className="catalog-rating">
        <strong>{categoryName}</strong>
        <span>2026 LPPEPTIDE catalog</span>
      </div>
      <div className="catalog-price">
        <strong>{price}</strong>
      </div>
    </div>
  );
}

export function CategoryCard({ product: p, warehouses }: { product: CatalogProduct; warehouses: PickWarehouse[] }) {
  return (
    <article className="product-card card-category">
      <Link href={productHref(p.slug)} className="product-card-detail-link" aria-label={`View ${p.name}`} />
      <div className="product-media">
        {p.image && <Image src={p.image} alt={p.name} width={400} height={400} sizes={imageSizes} />}
      </div>
      <div className="product-body">
        <p className="brand-name">SKU {p.sku}</p>
        <h3>{p.name}</h3>
        <p className="strength category-description">{p.description}</p>
        <Tags tags={p.tags} className="product-tag-row category-tag-row" />
        <Rating product={p} className="rating-row" label="Customer rating" />
      </div>
      <aside className="category-action-box" aria-label="Purchase actions">
        <div className="price-row category-price-row">
          <strong>{formatCents(catalogPriceCents(p))}</strong>
        </div>
        <p className="category-stock-line">{inStockAnywhere(p) ? "In stock" : "OUT STOCK"}</p>
        <ChooseWarehouseButtons
          productId={p.id}
          productName={p.name}
          prices={p.prices}
          warehouses={warehouses}
          classNames={{
            wrapper: "category-action-buttons",
            primary: "category-action-button category-action-button-primary",
            secondary: "category-action-button category-action-button-secondary",
          }}
        />
      </aside>
    </article>
  );
}

function Rating({ product: p, className, label = "Product rating" }: { product: CatalogProduct; className: string; label?: string }) {
  if (!p.rating) return null;
  return (
    <div className={className} aria-label={label}>
      <span className="stars" aria-hidden="true">
        {stars(p.rating)}
      </span>
      <strong>{p.rating.toFixed(1)}</strong>
      <span className="rating-count">({formatCount(p.reviewCount)})</span>
    </div>
  );
}

function Tags({ tags, className }: { tags: string[]; className: string }) {
  if (!tags.length) return null;
  return (
    <div className={className} aria-label="Product tags">
      {tags.map((t) => (
        <span key={t} style={tagStyle(t)}>
          {t}
        </span>
      ))}
    </div>
  );
}
