import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { lang } from "next/root-params";
import { CartHydrator } from "@/components/store/cart-widgets";
import { SiteFooter } from "@/components/store/SiteFooter";
import { SmartsuppChat } from "@/components/store/SmartsuppChat";
import { SupportWidget } from "@/components/store/SupportWidget";
import { I18nProvider } from "@/i18n/client";
import { HTML_LANG, isLocale, LOCALES } from "@/i18n/config";
import { MESSAGES } from "@/i18n/translate";
import "../store.css";

// Storefront root layout, one per locale (V2-5: /, /es, /pt). The admin has its own root layout.
// Headers differ (home: landing pill, other pages: context header), so each page group adds its own.

// No web font: the live CSS names Inter without loading it, so the body renders in the system UI font (docs/06).

const SITE_URL = process.env.SITE_URL ?? "https://lppeptide.co";

// Titles follow the live pattern "{Page} | LPPEPTIDE" (docs/05). The home page sets an absolute title.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "LPPEPTIDE | Research catalog and warehouse availability", template: "%s | LPPEPTIDE" },
  description:
    "Browse the LPPEPTIDE research catalog, choose a fulfillment warehouse, and review product documentation before ordering.",
  icons: { icon: "/favicon.ico" },
  openGraph: { siteName: "LPPEPTIDE", type: "website", images: ["/brand/lppeptide-logo-center.png"] },
};

export const viewport: Viewport = { themeColor: "#0b1e40" };

export function generateStaticParams() {
  return LOCALES.map((l) => ({ lang: l }));
}

export default async function StoreLayout({ children }: LayoutProps<"/[lang]">) {
  const locale = await lang();
  // src/proxy.ts only ever routes en/es/pt here (dynamicParams is unavailable with Cache Components).
  if (!isLocale(locale)) notFound();
  return (
    <html lang={HTML_LANG[locale]}>
      {/* Browser extensions add attributes to <body>; ignore those attribute mismatches only. */}
      <body suppressHydrationWarning>
        <I18nProvider locale={locale} messages={MESSAGES[locale]}>
          <CartHydrator />
          {children}
          <SiteFooter />
          <SupportWidget />
        </I18nProvider>
        <SmartsuppChat />
      </body>
    </html>
  );
}
