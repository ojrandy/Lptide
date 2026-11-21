import { LocaleLink as Link } from "@/i18n/client";
import { getI18n } from "@/i18n/server";
import type { shelfStats } from "@/lib/catalog";

/** Category / best-seller hero with breadcrumb and summary list (live: hero-section hero-category). */
export async function ShelfHero({
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
  const { t, href } = await getI18n();
  return (
    <section className={`hero-section hero-category ${tone}`} aria-labelledby="hero-title">
      <nav className="breadcrumb-row" aria-label={t("shelf.breadcrumb")}>
        <Link href={href("/catalog/")}>{t("common.home")}</Link>
        <span>&gt;</span>
        <strong>{title}</strong>
      </nav>
      <div className="hero-copy">
        <p className="eyebrow">{eyebrow}</p>
        <h1 id="hero-title">{title}</h1>
        <p className="hero-text">{text}</p>
        <ul className="hero-meta-list" aria-label={t("shelf.summary")}>
          <li>
            <span>{t("shelf.averageRating", { rating: stats.averageRating })}</span>
          </li>
          <li>
            <span className="hero-meta-text-desktop">{t("shelf.factoryDirect", { count: stats.count })}</span>
            <span className="hero-meta-text-mobile">{t("shelf.factoryDirectShort", { count: stats.count })}</span>
          </li>
          <li>
            <span>{t("shelf.updatedDaily")}</span>
          </li>
          <li>
            <span>{t("shelf.lastUpdated", { date: stats.lastUpdated })}</span>
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
