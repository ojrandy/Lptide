import Link from "next/link";
import type { shelfStats } from "@/lib/catalog";

/** Category / best-seller hero with breadcrumb and summary list (live: hero-section hero-category). */
export function ShelfHero({
  tone,
  eyebrow,
  title,
  text,
  stats,
}: {
  tone: string;
  eyebrow: string;
  title: string;
  text: string;
  stats: ReturnType<typeof shelfStats>;
}) {
  return (
    <section className={`hero-section hero-category ${tone}`} aria-labelledby="hero-title">
      <nav className="breadcrumb-row" aria-label="Breadcrumb">
        <Link href="/catalog/">Home</Link>
        <span>&gt;</span>
        <strong>{title}</strong>
      </nav>
      <div className="hero-copy">
        <p className="eyebrow">{eyebrow}</p>
        <h1 id="hero-title">{title}</h1>
        <p className="hero-text">{text}</p>
        <ul className="hero-meta-list" aria-label="Category summary">
          <li>
            <span>★ {stats.averageRating} average rating</span>
          </li>
          <li>
            <span className="hero-meta-text-desktop">{stats.count} factory-direct products</span>
            <span className="hero-meta-text-mobile">{stats.count} factory-direct</span>
          </li>
          <li>
            <span>Updated daily</span>
          </li>
          <li>
            <span>Last updated {stats.lastUpdated}</span>
          </li>
        </ul>
      </div>
    </section>
  );
}

export function SubscribePromo() {
  return (
    <section className="promo-band" aria-label="Subscribe promotion">
      <div>
        <p className="section-kicker">Subscribe &amp; save</p>
        <h2>Recurring lab essentials without reordering rush</h2>
        <p>Set delivery cadence for supplies, cold packs, and factory-direct batches with flexible skip controls.</p>
      </div>
      <a href="#products">Start a subscription</a>
    </section>
  );
}
