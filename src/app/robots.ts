import type { MetadataRoute } from "next";

// /robots.txt (docs/05): everything public is crawlable; private and transactional pages are not.
const SITE = (process.env.SITE_URL ?? "https://lppeptide.co").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  const privatePaths = ["/checkout", "/order", "/cart", "/login", "/account", "/register", "/forgot-password", "/reset-password"];
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Same private pages under the v2 /es and /pt prefixes.
        disallow: ["/admin", "/auth", ...privatePaths, ...privatePaths.flatMap((p) => [`/es${p}`, `/pt${p}`])],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
