import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { CartHydrator } from "@/components/store/cart-widgets";
import { ContextHeader } from "@/components/store/ContextHeader";
import { SiteFooter } from "@/components/store/SiteFooter";
import "./(store)/store.css";
import "@/styles/live/product.css";

// 404 for any unmatched URL (and unknown product/category/warehouse slugs, rewritten here by src/proxy.ts).
// Uses the live "unavailable product" component. Bypasses layouts, so it brings its own html/body and CSS.

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Page not found | LPPEPTIDE",
  robots: { index: false },
};

export default function GlobalNotFound() {
  return (
    <html lang="en" className={`${inter.variable} antialiased`}>
      <body suppressHydrationWarning>
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
      </body>
    </html>
  );
}
