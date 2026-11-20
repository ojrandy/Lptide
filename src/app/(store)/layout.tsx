import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { CartHydrator } from "@/components/store/cart-widgets";
import { SiteFooter } from "@/components/store/SiteFooter";
import "./store.css";

// Storefront root layout. The admin has its own root layout (separate CSS: shadcn + full Tailwind).
// Headers differ (home: landing pill, other pages: context header), so each page group adds its own.

// Body font (docs/06). Display headings use the Georgia stack from the live CSS.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });

const SITE_URL = process.env.SITE_URL ?? "https://lppeptide.com";

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

export default function StoreLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} antialiased`}>
      {/* Browser extensions add attributes to <body>; ignore those attribute mismatches only. */}
      <body suppressHydrationWarning>
        <CartHydrator />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
