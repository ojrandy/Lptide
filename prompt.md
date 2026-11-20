# prompt.md — Build prompts for LPPEPTIDE

Paste these into Claude Code **one at a time, in order**. Each prompt is one work session with a clear "done" definition. Start every session in the repo root so `CLAUDE.md` loads. After each one: run the checks, update `docs/09-project-tracker.md`, and commit.

---

## v1 — Look-alike storefront + order capture + admin (due Sun 22 Nov 2026)

### P0 — Foundation: schema, seed, tokens
```
Role: senior Next.js engineer on the LPPEPTIDE rebuild. Read CLAUDE.md and docs/02, 03, 04, 06 first.

Task:
1. Implement src/db/schema.ts exactly as docs/04-data-model.md. src/db/index.ts: a singleton
   node:sqlite DatabaseSync (WAL, foreign_keys=ON, busy_timeout) exported as `sqlite`, wrapped by
   drizzle-orm/sqlite-proxy exported as `db` (see docs/03 environment notes). Add drizzle.config.ts
   (generate only) and scripts/migrate.ts (sqlite-proxy migrator), then generate + run the first migration.
2. Write scripts/seed.ts (run with tsx) that upserts from _capture/: categories, warehouses (+taglines from
   the screenshots), products (content fixes from docs/01), product_prices from
   _capture/products/warehouse-prices.txt (cents), stock from warehouseAvailability, settings from
   site/notices.json + site/site-context.json, and the first admin from ADMIN_EMAIL/ADMIN_PASSWORD.
   Rewrite image paths to /uploads/products/<file>. Idempotent: running it twice changes nothing.
3. Put the design tokens and fonts from docs/06 into src/app/globals.css (@theme) and src/app/layout.tsx
   (Inter via next/font, Georgia as the serif stack).
4. Add scripts: typecheck, db:generate, db:migrate, db:seed, admin:create. Add .env.example (docs/08).

Constraints: no extra packages beyond docs/03. Money in integer cents. Keep legacy product IDs and slugs.
Done when: `npm run db:migrate && npm run db:seed` gives 60 products, 6 categories, 3 warehouses,
127 price rows; `npm run typecheck` passes. Print those counts.
```

### P1 — Storefront shell + home
```
Read CLAUDE.md, docs/05, docs/06 and look at _capture/screens/01–05 before writing code.

Build the (store) route group layout and the home page so they look like the live site:
- AnnouncementBar (from settings), sticky floating pill Header (logo, 3 warehouse links with
  "Ships to…" sublines, Affiliate, COA, search/account/cart icons with cart count), Footer (exact columns
  and RUO copy).
- Home sections in order: hero (lab background, navy panel + 3 cards), "Factory hot products by warehouse"
  (tabs per warehouse, product cards from DB), "Supplying Local Distributors Worldwide" (copy from
  _capture/site/supply-model.json), "Supply Assurance System", communities, RUO notice, "A closer look" videos
  (from homepage-videos.json).
- Reusable ProductCard (stock badge, red sale price + struck list price, yellow Add to cart / grey OUT STOCK).
Server components by default; client components only for interactivity (cart button, tabs, mobile menu).
If a colour isn't in docs/06, open the live page in the browser and sample it. Don't guess.
Done when: the home page at 1280px and 390px matches screenshots 01–05 side by side. Typecheck and lint pass.
```

### P2 — Catalog, warehouse, product pages
```
Read docs/05 and _capture/screens/06–09. Implement:
- /warehouse/[code]/ (cnfc|usfc|ausfc): heading + products grouped by category with that warehouse's
  price/stock; products not sold there are hidden.
- /catalog/, /category/[slug]/ (hero + introMd via react-markdown, links rewritten to .html),
  /best-sellers/ (tag "Best Sellers"), header search (simple LIKE on name/sku).
- /peptide/[file]/: accepts slug or slug.html (canonical .html), ?warehouse= preselect. Layout per docs/06:
  gallery, title block, sticky buy box (warehouse selector showing price/stock per warehouse, delivery
  country select limited to that warehouse's countries, Add to cart, Buy now), spec table from glance,
  tab bar that scrolls to stacked section panels, reviews with rating breakdown, Q&A.
- generateMetadata for all of these (titles and descriptions as on the live site), JSON-LD Product.
- ISR revalidate 300 and tag 'products'.
Done when: every product URL in _capture/SUMMARY.md returns 200 (write scripts/smoke.ts and run it),
the product page matches screenshots 06–08, and the warehouse grid matches 09.
```

### P3 — Content pages, COA, calculator
```
Implement the content pages using the exact copy in _capture/pages/*.md: /about/, /help/faq/ (accordion),
/help/fees/, /help/shipping/ (with #track-order anchor → order lookup), /legal/terms/, /affiliate-program/
(content + contact CTA only). /coa/: searchable grid of products with coaUrl (screens/10).
/reconstitution-calculator/: client component with Reconstitution, Cost per dose and Vial duration tabs
(screens/11). Formulas: total mcg = mg×1000; concentration = total mcg / mL; volume (mL) = dose / concentration;
units = volume × 100 (U-100), with U-50/U-40 options; doses per vial = total mcg / dose.
Each page has generateMetadata matching the live title/description.
Done when: all routes in docs/05 "content" rows return 200 and the calculator matches the live results for
5 mg / 2 mL / 250 mcg.
```

### P4 — Cart, checkout, emails
```
Read docs/02 (data flow), docs/04 (server rules), docs/08 (security). Implement:
- Zustand cart (persist) holding {productId, warehouseCode, qty} only, one warehouse per cart (adding
  from another warehouse asks to switch). Cart page with a server-side quote action (current prices, stock).
- /checkout/: contact + shipping form (country limited to warehouse countries), honeypot, notes.
- placeOrder Server Action: Zod → rate limit (5/10min/IP) → server pricing → stock + country check → one
  transaction (order, items snapshot, event PENDING_PAYMENT) → emails via Nodemailer (failure logged, never
  thrown) → redirect to /order/[number]/?t=<HMAC token>.
- /order/[number]/: summary + payment instructions (settings, markdown) + support contacts.
- /login/ and /account/: order lookup by number + email → redirects to the tokenised order page.
- Email templates (plain, inline-styled HTML + text): store notification, customer confirmation.
Done when: a test order shows up in the DB, both emails render (use a local SMTP catcher if no credentials
yet), tampering with the price in localStorage has no effect on the total, and a 6th rapid order is rejected.
```

### P5 — Admin dashboard
```
Read docs/07 fully. Run: npx shadcn@latest init, then add the components listed in docs/03.
Implement admin auth (jose cookie, bcryptjs, proxy.ts gate, requireAdmin() in every page/action, login
rate limit), then: Overview KPIs, Orders (filters, pagination), Order detail (allowed transitions only,
SHIPPED requires tracking → shipped email, notes, timeline), Products list with inline per-warehouse
price/stock edit, Product edit (basics, image + COA upload per docs/08 rules, JSON content with Zod
validation, slug read-only), Settings (announcement, payment instructions, shipping fee per warehouse,
contacts, change password). Every mutation calls revalidateTag/revalidatePath so the storefront updates at once.
Done when: an unauthenticated request to any /admin page or action is refused; changing a price in the admin
shows up on the product page immediately; an order moves PENDING_PAYMENT → PAID → SHIPPED and the
customer email is sent.
```

### P6 — SEO, hardening, deploy
```
Read docs/05 checklist and docs/08. Implement sitemap.ts, robots.ts, canonical on every page, OG images,
Organization JSON-LD, /es/* and /pt/* → English 302 in proxy.ts, security headers in next.config.ts,
styled not-found. Run typecheck, lint, build, and scripts/smoke.ts over every URL in docs/05. Run a 390px
visual pass against the live site and fix the differences. Write scripts/backup.sh and a short
docs/ADMIN-GUIDE section in README.md. Then follow docs/08 "Deploy steps" and the launch checklist.
Done when: every launch checklist item in docs/08 is ticked and docs/09 is updated.
```

---

## v2 — Full logistics & growth (after delivery)
Run each prompt after reading docs/01 (v2 scope) and the current code. Each one starts with:
"Propose the schema and route changes first and wait for approval before coding."

### V2-1 — Customer accounts
```
Add customer accounts: email + password and Google sign-in (Auth.js only for customers; admin auth stays as
is). Link existing orders by email on first sign-in. /account/ shows order history and saved addresses.
Cart syncs to the account when signed in. Keep guest checkout.
```

### V2-2 — Shipping rules engine
```
Replace the flat per-warehouse fee with rules: per warehouse × country group × weight bands (product
weightKg × qty) × item-count thresholds, plus free-shipping threshold. Admin CRUD for rules with a
"preview a cart" tester. Checkout shows the computed fee before ordering. Existing orders are unaffected.
```

### V2-3 — Payments & fulfilment
```
Add the payment methods the client confirms (e.g. crypto invoice provider, bank transfer references). Each
order gets a unique payment reference; admin can mark paid with proof attachment. Add carrier tracking
links per carrier and a public tracking page (/help/shipping#track-order). Low-stock alerts per warehouse.
```

### V2-4 — Affiliate program
```
Affiliate applications (form → admin approve), unique referral codes/links (cookie 30 days), commission
attribution on PAID orders, affiliate dashboard (clicks, orders, commission), admin payout log.
```

### V2-5 — Reviews, Q&A, i18n, support
```
Verified-buyer reviews and product questions with admin moderation (replace JSON columns with tables via
migration). Spanish (/es) and Portuguese (/pt) with next-intl, translating UI strings plus product content
fields, with hreflang tags. Optional support chat embed or a Telegram deep-link widget.
```
