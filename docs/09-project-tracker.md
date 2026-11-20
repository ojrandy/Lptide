# 09 — Project Tracker

Deadline: **Sun 22 Nov 2026, 12:00–15:00.** Status: `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked
Update this file at the end of every work session.

## Phase 0 — Foundation (Fri 20 Nov, evening)
- [x] Capture live site → `_capture/` (60 products, prices per warehouse, pages, tokens, screenshots)
- [x] Docs 01–09, CLAUDE.md, prompt.md
- [x] Scaffold Next.js 16 + install dependencies
- [x] Assets downloaded (B1 approved 2026-11-20): 77 product images → `uploads/products` (`npm run assets:fetch`, re-runnable), logos, hero scenes, favicon → `public/`, 4 home videos → `public/videos`. COA documents: live `/coa/{code}` pages, handled in P3.
- [x] Tokens + fonts (`src/app/(store)/store.css`), root layout. Exact colours now come from the ported live CSS.
- [x] Drizzle schema + first migration (`drizzle/0000_*.sql`, `npm run db:migrate`)
- [x] Seed script (`_capture` → DB, content fixes applied): 60 products, 6 categories, 3 warehouses, 127 prices; idempotent (verified by table hashes). `admin:create` added.

## Phase 1 — Storefront shell & catalog (Sat 21 Nov, morning)
- [x] Announcement bar, sticky pill header (warehouse menu, search, account, cart badge), footer, mobile menu, search dialog
- [x] Home: hero (2-scene crossfade), warehouse hot products, supply model, supply assurance, communities, RUO notice, videos. Checked at desktop and mobile widths.
- [x] Warehouse pages ×3 (grouped by category, sale + struck list price, add to cart)
- [x] Product cards: warehouse, catalog, category/best-seller variants; tag pills in live colours
- [x] Product page: gallery, buy box (warehouse radios, `?warehouse=` lock, delivery-country combobox required before Add to Cart), glance table, tab bar, sections, reviews, Q&A, related products, mobile purchase bar, JSON-LD Product
- [x] Catalog + category (intro markdown) + best-sellers + search (`/catalog/?q=`), client-side sort
- [x] Styled 404 (`global-not-found.tsx`); unknown slugs get a real 404 status via `proxy.ts`
- [x] `npm run smoke -- <url>`: 81/81 on the production build (all 60 product URLs, redirects, 404s)

## Phase 2 — Content pages & order flow (Sat 21 Nov, afternoon)
- [x] About, Contact, FAQ, Fees, Shipping (+ `#track-order` panel), Terms, Affiliate (content; CTA → contact). Copy generated verbatim from the live pages into `src/content/pages.ts`
- [x] COA library (search, preview) + `/coa/{code}/`; 24 certificate files in `uploads/coa` (`assets:fetch`)
- [x] Research tools: reconstitution, cost per dose, vial duration, product lookup (live formulas and rounding; 5 mg / 2 mL / 250 mcg matches live)
- [x] Smoke: 96/96 on the production build
- [x] Cart store + cart page (one warehouse per cart, server quote, delivery country, live 5% handling fee and $199 minimum)
- [x] Checkout + `placeOrder` action (Zod, rate limit 5/10 min, honeypot, server pricing, one synchronous transaction, item snapshots, event)
- [x] Order confirmation page (HMAC token, noindex) + order lookup (`/login/`, `/account/`, live login layout)
- [x] Emails: store notification + customer confirmation (+ shipped template for P5); saved as `data/mail/*.eml` until SMTP is configured
- [x] Verified end to end on a production build: product → cart ($131 → blocked by minimum; qty 3 → $265) → checkout → order page, DB rows, both emails. Tampering refused (wrong warehouse/country, unknown product, qty 5000, client price ignored, out of stock, honeypot, bad email); 6th order in 10 min refused. Smoke 101/101, pricing 17/17.

## Phase 3 — Admin (Sat 21 Nov night → Sun 22 Nov morning)
- [ ] Auth: login, JWT cookie, `proxy.ts`, `requireAdmin()`, rate limit
- [ ] Overview KPIs
- [ ] Orders list + filters, order detail, status transitions, tracking + shipped email
- [ ] Products list with per-warehouse quick price/stock edit
- [ ] Product edit (basics, image/COA upload, JSON content)
- [ ] Settings (announcement, payment instructions, shipping fees, contacts, password)

## Phase 4 — SEO, QA, deploy (Sun 22 Nov, until handover)
- [ ] Metadata parity, canonical, sitemap, robots, JSON-LD, `/es` `/pt` redirects
- [ ] Smoke script over all URLs in doc 05
- [ ] Mobile pass at 390px against live site
- [ ] Security headers, `typecheck` + `lint` + `build` clean
- [ ] Deploy to VPS, seed, change admin password, backups
- [ ] DNS cutover (MX untouched), test order end-to-end
- [ ] Handover: admin credentials to client, short admin guide

## Blockers / needs from client
| # | Item | Owner | Status |
|---|---|---|---|
| B1 | Approval to download images/COAs from live site | Developer | done 2026-11-20 |
| B2 | SMTP credentials for lppeptideofficial@lppeptide.com | Client | open |
| B3 | VPS + DNS (Cloudflare) access | Client | open |
| B4 | Payment methods & instructions text | Client | partly answered: live cart says "Crypto (BTC/ETH/USDC) · Card & ACH coming soon". Still need the actual payment instructions (wallet addresses / process); placeholder text until then, editable in admin. |
| B5 | Shipping fee per warehouse | Client | **answered by the live Shipping Policy**: US $30 first item + $5/item; AU $20 + $5/item; Asia→US $85 first 0.5 kg + $25/0.5 kg; Asia→other $60 + $25/0.5 kg. Implemented at checkout (P4), admin-editable. |
| B6 | Retatrutide 60mg has SKU "RETATRUTIDE" in the live data (likely should be RT60). Kept as captured; client to confirm, then fix in admin. | Client | open |

## Decisions log
| Date | Decision |
|---|---|
| 2026-11-20 | Next.js 16 + SQLite/Drizzle + Server Actions, VPS hosting (doc 02 D1–D6) |
| 2026-11-20 | v1 = look-alike storefront + order capture + admin. Logistics, accounts, affiliate, i18n → v2 |
| 2026-11-20 | Keep all slugs and `.html` product URLs. Fix display typos only. |
| 2026-11-20 | DB driver: built-in `node:sqlite` + Drizzle `sqlite-proxy`. better-sqlite3's compiled addon is blocked by Windows Application Control. Verified working. |
| 2026-11-20 | Prices are per warehouse with a 20% sale vs list price (captured in `warehouse-prices.txt`) |
| 2026-11-20 | Seed: captured data is upserted. Admin-owned values that aren't in the capture (warehouse `shippingFee` = 0, `paymentInstructions` placeholder, `storeInbox`, first admin) are set on first insert only, so a re-seed never overwrites admin edits. |
| 2026-11-20 | "Coze" wording replaced at seed time: exactly as the live page displays them: "Coze describes" → "The LPPEPTIDE knowledge record describes"; "Coze source" → "LPPEPTIDE knowledge source"; "Coze specs" → "LPPEPTIDE reference specs"; "Coze specification match" → "LPPEPTIDE knowledge base specification match"; "Coze preparation pattern" → "LPPEPTIDE preparation pattern". The seed fails if any "Coze" remains. |
| 2026-11-20 | Name fixes: AOD 9064 → 9604 (also in that product's text), Chinese suffixes dropped, full-width brackets → ASCII ("… (Glow)"). Slugs unchanged. |
| 2026-11-20 | `products.coaUrl` holds the live `coaPath` (`/coa/rt10`, 24 products). Section blocks keep an optional `links` array (one block has COA links). Hidden reviews are skipped (none today). |
| 2026-11-20 | **Styling = the live site's own CSS**, recovered from its served bundle into `src/styles/live/` (scope attributes stripped, otherwise verbatim), with the live class names in our markup. Fastest route to pixel parity. Never hand-edit the ported files; overrides go in a separate file. |
| 2026-11-20 | Storefront loads Tailwind **without preflight** (the live site had no reset; preflight removed bullets and margins it relies on). Storefront and admin get **separate root layouts**, so the admin can use shadcn + full Tailwind. |
| 2026-11-20 | Cache Components is on (Next 16): data functions use `'use cache'` + `cacheLife('catalog')` (5 min) + `cacheTag('products' or 'settings')`; admin actions call `updateTag`. Pages prerender from the DB at build, so deploy runs **migrate before build** (doc 08 updated). |
| 2026-11-20 | Home "hot products" is a curated, ordered list (`settings.hotProducts`, seeded from the live page); each warehouse shows the first 10 it sells. The live list isn't computed from sales either. |
| 2026-11-20 | Header search submits GET `/catalog/?q=` (works without JS). Dev server falls back to :3001 when :3000 is busy. |
| 2026-11-20 | Product page follows the **current** live page, which differs from docs/06: no "Buy Now" on the product page (catalog/category cards keep it), breadcrumb "Home > LPPEPTIDE > name", and opening from a warehouse page (`?warehouse=`) locks the order to that warehouse. A delivery country served by the chosen warehouse is required before Add to Cart. |
| 2026-11-20 | Catalog/category "Add to Cart" picks the warehouse automatically (cart's warehouse, or the only in-stock one) and otherwise asks in a small picker (`lp-warehouse-picker`), matching the live "select a warehouse first" rule. Prices shown without a warehouse = lowest list price (as live). |
| 2026-11-20 | Unknown product/category/warehouse slugs: `proxy.ts` (Node runtime) checks the DB and rewrites to the global 404 with status 404. Needed because partially prerendered pages would otherwise stream `notFound()` with status 200. Uses Next's documented `experimental.globalNotFound` (also required once the admin has its own root layout). |
| 2026-11-20 | Category pages are served at the canonical slug; the `-and-` spelling used by live catalog links 301s to it. Descriptions are computed like live ("Browse N … including M COA-verified listings", COA-verified = tagged "COA"). |
| 2026-11-20 | COA certificates are their own records (24 files with SKU, report no., record id), stored as the `coaCertificates` setting (seeded from `scripts/data/coa-certificates.json`), so no schema change; editable as JSON in the admin. |
| 2026-11-20 | Calculator tabs, `/product-lookup/` and `/contact/` are separate live URLs; added for URL parity (docs/05 updated). Syringe scale follows live exactly: U-100 = 100, U-50 = 50, U-30 = 30 units/mL, or custom. |
| 2026-11-20 | Shipping tracking panel: an LP order number opens the order lookup; other numbers open the chosen carrier's public tracking page in a new tab (a link, not an API call). |
| 2026-11-20 | Shipping fees follow the **published live Shipping Policy** (per-item for US/AU, per-0.5 kg by destination for Asia) instead of a flat fee: a flat fee would contradict the site's own policy page. |
| 2026-11-20 | DB connection sets `busy_timeout` before switching to WAL (parallel build workers hit "database is locked" otherwise). |
| 2026-11-20 | Checkout follows the live cart rules (recovered from its bundle): 5% handling fee on products + shipping, rounded up to whole dollars; $199.00 minimum including shipping and handling; shipping per the published policy. Stored as `checkout` setting + `warehouses.shippingRule`; `orders.handlingCents` added (migrations 0001, 0002). |
| 2026-11-20 | Order transaction runs synchronously on the raw `node:sqlite` handle (`BEGIN IMMEDIATE`), re-pricing inside the transaction, so no other request can interleave. Emails are sent with `after()` (after the response) and never fail the order. |
| 2026-11-20 | Without SMTP credentials, emails are written to `data/mail/*.eml` (dev and pre-handover). Configure `SMTP_*` in production. |
| 2026-11-20 | Live text-replacement chain (product bundle) mirrored in the seed, incl. CJC-1295 wording and a final `Coze` → `LPPEPTIDE knowledge base` catch-all. |

## v2 backlog
Accounts + Google login · shipping rule engine · payment integrations · tracking automation · affiliate program · reviews/Q&A moderation · es/pt locales · support chat · structured content editor · Postgres if multi-instance
