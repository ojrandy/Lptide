import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Body font (docs/06). Display headings use the Georgia stack via `font-serif`.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// Home title/description from _capture/pages/home.md; pages override with "{Page} | LPPEPTIDE" (docs/05).
export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "https://lppeptide.com"),
  title: "LPPEPTIDE | Research catalog and warehouse availability",
  description:
    "Browse the LPPEPTIDE research catalog, choose a fulfillment warehouse, and review product documentation before ordering.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
