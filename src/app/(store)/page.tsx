import { ExternalLink, MessagesSquare, Send, ShieldCheck, Truck } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AnnouncementBar } from "@/components/store/AnnouncementBar";
import { CartCount } from "@/components/store/cart-widgets";
import { HeroScenes } from "@/components/store/home/HeroScenes";
import { ProductRail } from "@/components/store/home/ProductRail";
import { VideoGallery } from "@/components/store/home/VideoGallery";
import { LandingHeader } from "@/components/store/LandingHeader";
import { community, hero, popular, ruo, supplyModel, videos, warehouseDispatch } from "@/content/home";
import { formatCents } from "@/lib/money";
import { productHref, type ProductCardData } from "@/lib/product-utils";
import { getHotProductsByWarehouse } from "@/lib/queries/products";
import { getSettings } from "@/lib/queries/settings";
import "@/styles/live/landing.css";

export const metadata: Metadata = {
  title: { absolute: "LPPEPTIDE | Research catalog and warehouse availability" },
  description:
    "Browse the LPPEPTIDE research catalog, choose a fulfillment warehouse, and review product documentation before ordering.",
  alternates: { canonical: "/" },
};

const ASSURANCE_ICONS = { truck: Truck, shield: ShieldCheck, messages: MessagesSquare };

export default async function HomePage() {
  const [shelves, { contact }] = await Promise.all([getHotProductsByWarehouse(), getSettings()]);

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "LPPEPTIDE",
    url: process.env.SITE_URL ?? "https://lppeptide.com",
    logo: `${process.env.SITE_URL ?? "https://lppeptide.com"}/brand/lppeptide-logo-center.png`,
    email: contact.email || undefined,
    telephone: contact.phone || undefined,
    sameAs: contact.telegram ? [contact.telegram] : undefined,
  };

  return (
    <div className="landing-preview">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }} />
      <AnnouncementBar variant="landing" />
      <LandingHeader />

      <main>
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="hero-copy">
            <h1 id="landing-title">
              {hero.title[0]}
              <br />
              {hero.title[1]}
            </h1>
            <span className="hero-subtitle">{hero.subtitle}</span>
            <p>{hero.body}</p>
            <div className="hero-actions">
              <Link href={hero.primary.href}>{hero.primary.label}</Link>
              <a href={hero.secondary.href}>{hero.secondary.label}</a>
            </div>
          </div>
          <HeroScenes scenes={hero.scenes} />
          <div className="hero-assurance-cards">
            {hero.cards.map((c) => (
              <article key={c.eyebrow}>
                <span>{c.eyebrow}</span>
                <h2>{c.title}</h2>
                <p>{c.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="page-section popular-section" aria-labelledby="popular-title">
          <div className="popular-heading">
            <h2 id="popular-title">{popular.title}</h2>
            <p>{popular.body}</p>
          </div>
          <div className="warehouse-product-shelves">
            {shelves
              .filter((s) => s.products.length > 0)
              .map(({ warehouse, products }) => {
                const label = `${warehouse.name} hot products`;
                const titleId = `warehouse-${warehouse.code}-hot-title`;
                return (
                  <section key={warehouse.code} className="warehouse-product-shelf" aria-labelledby={titleId}>
                    <header className="warehouse-product-shelf-header">
                      <div>
                        <h3 id={titleId}>{label}</h3>
                        <p>{warehouseDispatch[warehouse.code] ?? warehouse.tagline}</p>
                      </div>
                    </header>
                    <ProductRail
                      id={`warehouse-${warehouse.code}-product-rail`}
                      label={label}
                      header={
                        <Link href={`/warehouse/${warehouse.code.toLowerCase()}/`}>
                          View full inventory <ExternalLink size={14} aria-hidden="true" />
                        </Link>
                      }
                    >
                      {products.map((p) => (
                        <HotProductCard key={p.id} product={p} warehouseCode={warehouse.code} />
                      ))}
                    </ProductRail>
                  </section>
                );
              })}
          </div>
        </section>

        <section id="supply-model" className="supply-model" tabIndex={-1} aria-labelledby="supply-model-title">
          <h2 id="supply-model-title">{supplyModel.title}</h2>
          <p>{supplyModel.subtitle}</p>
          <div className="supply-model-grid">
            {supplyModel.cards.map((c, i) => (
              <article key={c.title} className="supply-model-card">
                <span className="supply-model-number">{i + 1}</span>
                <h3>{c.title}</h3>
                <p>{c.body}</p>
                {c.bullets && (
                  <ul>
                    {c.bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                )}
                {c.result && <p className="supply-model-result">{c.result}</p>}
              </article>
            ))}
          </div>
        </section>

        <section className="supply-assurance" aria-labelledby="supply-assurance-title">
          <h2 id="supply-assurance-title">{supplyModel.assuranceTitle}</h2>
          <div className="supply-assurance-grid">
            {supplyModel.assurances.map((a) => {
              const Icon = ASSURANCE_ICONS[a.icon];
              return (
                <article key={a.title} className="supply-assurance-card">
                  <div className="supply-assurance-icon">
                    <Icon size={22} aria-hidden="true" />
                  </div>
                  <span className="supply-assurance-eyebrow">{a.eyebrow}</span>
                  <h3>{a.title}</h3>
                  <p>{a.body}</p>
                  <ul>
                    {a.bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                  <p className="supply-assurance-result">{a.result}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="community-section" aria-labelledby="community-title">
          <h2 id="community-title">{community.title}</h2>
          <p>{community.body}</p>
          <div className="community-stats">
            {community.stats.map((s) => (
              <article key={s.label}>
                <strong>{s.value}</strong>
                <span>{s.label}</span>
              </article>
            ))}
          </div>
          <p className="community-proof">{community.proof}</p>
          <div className="community-links">
            {community.links.map((l) => (
              <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer">
                <span className="community-icon">
                  <Send size={20} aria-hidden="true" />
                </span>
                <span className="community-copy">
                  <strong>{l.name}</strong>
                  <small>{l.body}</small>
                </span>
                <span className="community-action">
                  {l.action} <span aria-hidden="true">→</span>
                </span>
              </a>
            ))}
          </div>
        </section>

        <section className="assurance">
          <h2>{ruo.title}</h2>
          <p>{ruo.body}</p>
        </section>

        <VideoGallery title={videos.title} items={videos.items} />
      </main>

      <nav className="mobile-quick-nav" aria-label="Quick links">
        <Link href="/catalog/">Catalog</Link>
        <Link href="/best-sellers/">Popular</Link>
        <Link href="/cart/">
          Bag <CartCount />
        </Link>
      </nav>
    </div>
  );
}

function HotProductCard({ product: p, warehouseCode }: { product: ProductCardData; warehouseCode: string }) {
  return (
    <Link href={`${productHref(p.slug)}?warehouse=${warehouseCode}`} className="product-card" role="listitem">
      <div className="product-card-media">
        {p.image ? (
          <Image src={p.image} alt={p.name} width={400} height={400} sizes="224px" />
        ) : (
          <span className="product-image-unavailable">Image unavailable</span>
        )}
        {!p.inStock && <span className="popular-stock-overlay">OUT STOCK</span>}
      </div>
      <h4>{p.name}</h4>
      <strong>{formatCents(p.priceCents)}</strong>
      <span className={`popular-product-stock ${p.inStock ? "is-in_stock" : "is-out_of_stock"}`}>
        {p.inStock ? "In stock" : "Out of stock"}
      </span>
    </Link>
  );
}
