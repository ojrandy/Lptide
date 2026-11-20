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
- [ ] Warehouse pages ×3 (grouped by category)
- [ ] Product card component (stock badge, sale/list price, add to cart)
- [ ] Product page: gallery, buy box (warehouse + country), spec table, tab bar, sections, reviews, Q&A
- [ ] Catalog + category + best-sellers + search
- [ ] Styled 404

## Phase 2 — Content pages & order flow (Sat 21 Nov, afternoon)
- [ ] About, FAQ, Fees, Shipping (+ track order anchor), Terms, Affiliate (content)
- [ ] COA library (search)
- [ ] Reconstitution calculator (3 tabs, client-side)
- [ ] Cart store + cart page (one warehouse per cart)
- [ ] Checkout + `placeOrder` action (Zod, rate limit, honeypot, server pricing, transaction)
- [ ] Order confirmation page + order lookup (`/login`, `/account`)
- [ ] Emails: store notification + customer confirmation

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
| B4 | Payment methods & instructions text | Client | open (placeholder text in v1) |
| B5 | Shipping fee per warehouse | Client | open (flat fee setting in v1) |

## Decisions log
| Date | Decision |
|---|---|
| 2026-11-20 | Next.js 16 + SQLite/Drizzle + Server Actions, VPS hosting (doc 02 D1–D6) |
| 2026-11-20 | v1 = look-alike storefront + order capture + admin. Logistics, accounts, affiliate, i18n → v2 |
| 2026-11-20 | Keep all slugs and `.html` product URLs. Fix display typos only. |
| 2026-11-20 | DB driver: built-in `node:sqlite` + Drizzle `sqlite-proxy`. better-sqlite3's compiled addon is blocked by Windows Application Control. Verified working. |
| 2026-11-20 | Prices are per warehouse with a 20% sale vs list price (captured in `warehouse-prices.txt`) |
| 2026-11-20 | Seed: captured data is upserted. Admin-owned values that aren't in the capture (warehouse `shippingFee` = 0, `paymentInstructions` placeholder, `storeInbox`, first admin) are set on first insert only, so a re-seed never overwrites admin edits. |
| 2026-11-20 | "Coze" wording replaced at seed time: "Coze describes" → "The LPPEPTIDE knowledge record describes"; "Coze source/specs/specification" → "LPPEPTIDE knowledge record…"; "Coze preparation pattern" → "LPPEPTIDE preparation pattern". The seed fails if any "Coze" remains. |
| 2026-11-20 | Name fixes: AOD 9064 → 9604 (also in that product's text), Chinese suffixes dropped, full-width brackets → ASCII ("… (Glow)"). Slugs unchanged. |
| 2026-11-20 | `products.coaUrl` holds the live `coaPath` (`/coa/rt10`, 24 products). Section blocks keep an optional `links` array (one block has COA links). Hidden reviews are skipped (none today). |
| 2026-11-20 | **Styling = the live site's own CSS**, recovered from its served bundle into `src/styles/live/` (scope attributes stripped, otherwise verbatim), with the live class names in our markup. Fastest route to pixel parity. Never hand-edit the ported files; overrides go in a separate file. |
| 2026-11-20 | Storefront loads Tailwind **without preflight** (the live site had no reset; preflight removed bullets and margins it relies on). Storefront and admin get **separate root layouts**, so the admin can use shadcn + full Tailwind. |
| 2026-11-20 | Cache Components is on (Next 16): data functions use `'use cache'` + `cacheLife('catalog')` (5 min) + `cacheTag('products' or 'settings')`; admin actions call `updateTag`. Pages prerender from the DB at build, so deploy runs **migrate before build** (doc 08 updated). |
| 2026-11-20 | Home "hot products" is a curated, ordered list (`settings.hotProducts`, seeded from the live page); each warehouse shows the first 10 it sells. The live list isn't computed from sales either. |
| 2026-11-20 | Header search submits GET `/catalog/?q=` (works without JS). Dev server falls back to :3001 when :3000 is busy. |

## v2 backlog
Accounts + Google login · shipping rule engine · payment integrations · tracking automation · affiliate program · reviews/Q&A moderation · es/pt locales · support chat · structured content editor · Postgres if multi-instance
