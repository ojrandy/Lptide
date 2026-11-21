import type { Metadata } from "next";
import { LocaleLink as Link } from "@/i18n/client";
import { CartHydrator } from "@/components/store/cart-widgets";
import { ContextHeader } from "@/components/store/ContextHeader";
import { SiteFooter } from "@/components/store/SiteFooter";
import { I18nProvider } from "@/i18n/client";
import { MESSAGES } from "@/i18n/translate";
import "./(store)/store.css";
import "@/styles/live/product.css";

// 404 for any unmatched URL (and unknown product/category/warehouse slugs, rewritten here by src/proxy.ts).
// Uses the live "unavailable product" component. Bypasses layouts, so it brings its own html/body and CSS.

export const metadata: Metadata = {
  title: "Page not found | LPPEPTIDE",
  robots: { index: false },
};

export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        {/* Outside the [lang] tree: English chrome. */}
        <I18nProvider locale="en" messages={MESSAGES.en}>
        <CartHydrator />
        <ContextHeader />
        <div className="site-shell">
          <main className="peptide-detail-page unavailable-product-page">
            <section className="unavailable-product-state" aria-labelledby="not-found-heading">
              <p>Page not found</p>
              <h1 id="not-found-heading">We couldn&apos;t find that page</h1>
              <span>The link may be out of date, or the product is no longer listed. Browse the catalog to find what you need.</span>
              <Link href="/catalog/">Browse catalog</Link>
            </section>
          </main>
        </div>
        <SiteFooter />
        </I18nProvider>
      </body>
    </html>
  );
}
