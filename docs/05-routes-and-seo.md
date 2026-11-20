# 05 — Routes, URL Parity & SEO

**Rule: every public URL on the live site keeps working.** Same path, same title and meta description (from `_capture/pages/*.md` and the product data). The live site uses **trailing slashes** for pages (`/about/`) and `.html` for products.

## Storefront routes
| URL | Source (live) | Notes |
|---|---|---|
| `/` | home | hero, warehouse hot products, supply model, supply assurance, communities, RUO notice, videos |
| `/warehouse/cnfc/` `/usfc/` `/ausfc/` | warehouse pages | products grouped by category, price/stock for that warehouse |
| `/catalog/` | catalog | all products, category filter, search |
| `/category/[slug]/` | category pages | hero + `introMd` + grid |
| `/best-sellers/` | popular | products tagged "Best Sellers" |
| `/peptide/[slug].html` | product | **also accept `/peptide/[slug]`** (category intros link without `.html`); canonical = `.html`. `?warehouse=CNFC` preselects warehouse |
| `/coa/` | COA library | searchable grid of the 24 certificate files (`settings.coaCertificates`) |
| `/coa/{code}/` | COA library | same, pre-filtered; product "View certificate" links here (product `coaUrl`) |
| `/reconstitution-calculator/` | calculator | client-side; tabs are **separate live URLs** (below) |
| `/cost-per-dose-calculator/` `/vial-duration-calculator/` `/product-lookup/` | calculator tabs | found on the live site 2026-11-20 (not in the original route list) |
| `/contact/` | contact | company template copy; calculator "WhatsApp" button links here |
| `/affiliate-program/` | affiliate | content + "contact us" CTA (program logic is v2) |
| `/about/` `/help/faq/` `/help/fees/` `/help/shipping/` `/legal/terms/` | content | copy from `_capture/pages` |
| `/cart/` | cart | |
| `/checkout/` | new | guest checkout |
| `/order/[number]/` | new | confirmation + payment instructions (requires matching email via signed token in URL) |
| `/login/` `/account/` | live: accounts | **v1: order lookup** (order number + email). Accounts in v2 |
| `/es/*` `/pt/*` | locales | **v1: 302 → English path** (v2: real translations) |

### Implementation notes
- Product route: `src/app/(store)/peptide/[file]/page.tsx`. Strip an optional `.html` from `file`, then look up the slug.
- Set `trailingSlash: true` in `next.config.ts`. Verify that `.html` product URLs are **not** given a trailing slash. If they are, handle `/peptide/*` in `proxy.ts`.
- Unknown slug → `notFound()` with the styled 404.

## Admin routes (noindex)
`/admin/login`, `/admin`, `/admin/orders`, `/admin/orders/[id]`, `/admin/products`, `/admin/products/[id]`, `/admin/settings`

## SEO checklist
- [ ] `generateMetadata` on every page: title pattern `"{Page} | LPPEPTIDE"`, matching the live site.
- [ ] Product title: `"{name} ({sku}) | LPPEPTIDE"`. Description: product `description`.
- [ ] `alternates.canonical` on every page (`https://lppeptide.com/...`).
- [ ] `src/app/sitemap.ts`: home, warehouses, catalog, categories, all enabled products, content pages.
- [ ] `src/app/robots.ts`: allow all, disallow `/admin`, `/checkout`, `/order`, `/cart`.
- [ ] Open Graph: product image on product pages, logo elsewhere.
- [ ] JSON-LD `Product` (name, sku, image, offers price/currency/availability) on product pages; `Organization` on home.
- [ ] `next/image` for every product image, with `alt` = product name.
- [ ] Post-deploy: submit the sitemap in Google Search Console and watch for 404s for 7 days.
