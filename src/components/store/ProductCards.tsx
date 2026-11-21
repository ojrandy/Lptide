"use client";

import Image from "next/image";
import { LocaleLink as Link } from "@/i18n/client";
import { useI18n } from "@/i18n/client";
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
  const { t, href: lp } = useI18n();
  const price = formatCents(catalogPriceCents(p));
  const href = lp(productHref(p.slug));
  return (
    <div className="catalog-product-row">
      <article className="product-card card-catalog">
        <Link href={href} className="product-card-detail-link" aria-label={t("card.view", { name: p.name })} />
        <div className="product-media">
          {p.image && <Image src={p.image} alt={p.name} width={400} height={400} sizes={imageSizes} />}
        </div>
        <div className="product-body">
          <p className="brand-name catalog-stock-line" aria-label={t("card.catalogStock")}>
            <span className="product-catalog-code">{p.sku}</span>
            <span className="product-catalog-label">{t("card.sku")}</span>
            <span className="product-catalog-count">{inStockAnywhere(p) ? t("common.inStock") : t("common.outStockShort")}</span>
          </p>
          <h3>{p.name}</h3>
          <Rating product={p} className="rating-row product-summary-rating" />
          <p className="product-description">{p.description}</p>
          <Tags tags={p.tags} className="product-tag-row" />
          <div className="price-row">
            <strong>{price}</strong>
          </div>
          <p className="timer">{t("card.catalogYear")}</p>
          <div className="card-actions">
            <Link href={href} className="add-button">
              {t("common.viewProduct")}
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
        <span>{t("card.catalogYear")}</span>
      </div>
      <div className="catalog-price">
        <strong>{price}</strong>
      </div>
    </div>
  );
}

export function CategoryCard({ product: p, warehouses }: { product: CatalogProduct; warehouses: PickWarehouse[] }) {
  const { t, href } = useI18n();
  return (
    <article className="product-card card-category">
      <Link href={href(productHref(p.slug))} className="product-card-detail-link" aria-label={t("card.view", { name: p.name })} />
      <div className="product-media">
        {p.image && <Image src={p.image} alt={p.name} width={400} height={400} sizes={imageSizes} />}
      </div>
      <div className="product-body">
        <p className="brand-name">{t("card.skuPrefix", { sku: p.sku })}</p>
        <h3>{p.name}</h3>
        <p className="strength category-description">{p.description}</p>
        <Tags tags={p.tags} className="product-tag-row category-tag-row" />
        <Rating product={p} className="rating-row" label={t("card.customerRating")} />
      </div>
      <aside className="category-action-box" aria-label={t("card.purchaseActions")}>
        <div className="price-row category-price-row">
          <strong>{formatCents(catalogPriceCents(p))}</strong>
        </div>
        <p className="category-stock-line">{inStockAnywhere(p) ? t("common.inStock") : t("common.outStockShort")}</p>
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

function Rating({ product: p, className, label }: { product: CatalogProduct; className: string; label?: string }) {
  const { t } = useI18n();
  if (!p.rating) return null;
  return (
    <div className={className} aria-label={label ?? t("card.productRating")}>
      <span className="stars" aria-hidden="true">
        {stars(p.rating)}
      </span>
      {/* Raw number like live: "4.8", "5" (not "5.0"). */}
      <strong>{p.rating}</strong>
      <span className="rating-count">({formatCount(p.reviewCount)})</span>
    </div>
  );
}

function Tags({ tags, className }: { tags: string[]; className: string }) {
  const { t } = useI18n();
  if (!tags.length) return null;
  return (
    <div className={className} aria-label={t("card.productTags")}>
      {tags.map((t) => (
        <span key={t} style={tagStyle(t)}>
          {t}
        </span>
      ))}
    </div>
  );
}
