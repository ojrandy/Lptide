import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // One styled 404 across the storefront and admin root layouts (src/app/global-not-found.tsx).
    globalNotFound: true,
  },
  // Storefront data: refreshed every 5 minutes, and at once when the admin saves (revalidateTag).
  cacheLife: {
    catalog: { stale: 300, revalidate: 300, expire: 86400 },
  },
  // The live site uses trailing slashes for pages (/about/). Product URLs end in .html (no slash): see src/proxy.ts.
  trailingSlash: true,
  images: {
    // Product images live in UPLOAD_DIR and are served by src/app/uploads/[...path]/route.ts.
    localPatterns: [{ pathname: "/uploads/**" }, { pathname: "/brand/**" }, { pathname: "/scenes/**" }],
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
