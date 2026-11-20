# 09 — Project Tracker

Deadline: **Sun 22 Nov 2026, 12:00–15:00.** Status: `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked
Update this file at the end of every work session.

## Phase 0 — Foundation (Fri 20 Nov, evening)
- [x] Capture live site → `_capture/` (60 products, prices per warehouse, pages, tokens, screenshots)
- [x] Docs 01–09, CLAUDE.md, prompt.md
- [x] Scaffold Next.js 16 + install dependencies
- [ ] **Download product images, COA files, logo, hero and deal images into `public/` / `uploads/`** (needs approval, see Blockers)
- [x] Tokens + fonts in `globals.css`, root layout (badge/button colours still to sample, TODO in globals.css)
- [x] Drizzle schema + first migration (`drizzle/0000_*.sql`, `npm run db:migrate`)
- [x] Seed script (`_capture` → DB, content fixes applied): 60 products, 6 categories, 3 warehouses, 127 prices; idempotent (verified by table hashes). `admin:create` added.

## Phase 1 — Storefront shell & catalog (Sat 21 Nov, morning)
- [ ] Announcement bar, sticky pill header (warehouse menu, search, account, cart badge), footer
- [ ] Home: hero, warehouse hot products, supply model, supply assurance, communities, RUO notice, videos
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
| B1 | Approval to download images/COAs from live site | Developer | open |
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

## v2 backlog
Accounts + Google login · shipping rule engine · payment integrations · tracking automation · affiliate program · reviews/Q&A moderation · es/pt locales · support chat · structured content editor · Postgres if multi-instance
