import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  // Self-contained .next/standalone (server.js + traced node_modules) for the Namecheap Passenger host (docs/08).
  output: "standalone",
  // No `partialPrefetching`: with it, Next 16.4 serves a param route's fallback shell (old prices) on the first
  // request after updateTag() and only upgrades the page in the background. Without it that request re-renders.
  cacheComponents: true,
  // Dev only: lets other devices load the dev server's JS and HMR (Wi-Fi 192.168.1.178, Ethernet 2 192.168.56.1).
  allowedDevOrigins: ["192.168.1.178", "192.168.56.1"],
  experimental: {
    // One styled 404 across the storefront and admin root layouts (src/app/global-not-found.tsx).
    globalNotFound: true,
    // Admin uploads: images and COAs up to 5 MB (doc 08) plus multipart overhead. Actions validate size themselves.
    serverActions: { bodySizeLimit: "6mb" },
  },
  // Storefront data: refreshed every 5 minutes, and at once when the admin saves (revalidateTag).
  cacheLife: {
    catalog: { stale: 300, revalidate: 300, expire: 86400 },
  },
  // The live site uses trailing slashes for pages (/about/). Product URLs end in .html (no slash): see src/proxy.ts.
  trailingSlash: true,
  // Next's own slash redirect runs before src/proxy.ts, so /peptide/x would hop twice (→ /peptide/x/ → .html).
  // The proxy adds trailing slashes itself, folding every URL fix into a single redirect.
  skipTrailingSlashRedirect: true,
  images: {
    // Product images live in UPLOAD_DIR and are served by src/app/uploads/[...path]/route.ts.
    // /products/** = static page art in public/products (e.g. the company-page hero on /legal/terms/).
    localPatterns: [{ pathname: "/uploads/**" }, { pathname: "/brand/**" }, { pathname: "/scenes/**" }, { pathname: "/products/**" }],
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
