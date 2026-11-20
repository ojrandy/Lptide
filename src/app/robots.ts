import type { MetadataRoute } from "next";

// /robots.txt (docs/05): everything public is crawlable; private and transactional pages are not.
const SITE = (process.env.SITE_URL ?? "https://lppeptide.com").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/checkout", "/order", "/cart", "/login", "/account"] }],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
