# 02 — Architecture

## Shape
One Next.js app, one SQLite file, one uploads folder. There's no separate API server.

```
Browser ──HTTPS──► Cloudflare (DNS/CDN, existing) ──► Caddy (TLS) ──► Next.js (PM2, :3000)
                                                                     ├─ RSC pages (storefront, admin)
                                                                     ├─ Server Actions (checkout, admin mutations)
                                                                     ├─ node:sqlite (Drizzle) ──► data/lppeptide.db
                                                                     ├─ fs ──► uploads/ (served at /uploads)
                                                                     └─ Nodemailer ──SMTP──► client mailbox
```

## Folder layout
```
/                       CLAUDE.md, prompt.md, README.md
/_capture               live-site capture (read-only; seed input)
/docs                   01–09 project docs
/drizzle                SQL migrations
/scripts                seed.ts, create-admin.ts, backup.sh
/public                 static assets (logo, hero, deal images)
/src
  /app
    /(store)            storefront route group + its layout (announcement, header, footer)
      page.tsx          home
      warehouse/[code]/ catalog/ category/[slug]/ best-sellers/
      peptide/[file]/   product (slug or slug.html)
      coa/ reconstitution-calculator/ affiliate-program/ about/ help/* legal/terms/
      cart/ checkout/ order/[number]/ login/ account/
    /admin              admin route group + its layout (sidebar)
      login/ page.tsx orders/ orders/[id]/ products/ products/[id]/ settings/
    sitemap.ts robots.ts not-found.tsx globals.css layout.tsx
  /components
    /store              Header, Footer, AnnouncementBar, ProductCard, BuyBox, ...
    /admin              OrdersTable, StatusControl, PriceGrid, ...
    /ui                 shadcn components
  /db                   schema.ts, index.ts (singleton connection)
  /lib
    queries/            read functions used by RSC (products, orders, settings)
    actions/            'use server' mutations (checkout.ts, orders.ts, products.ts, settings.ts, auth.ts)
    auth.ts             session sign/verify, requireAdmin()
    email.ts            transporter + templates
    money.ts            cents formatting
    rate-limit.ts       in-memory sliding window
    validation.ts       Zod schemas
  /store                cart.ts (Zustand)
  proxy.ts              /admin gate, /es|/pt redirect
```

## Data flow
- **Reads:** server components call `lib/queries/*` → Drizzle → SQLite. Storefront pages use ISR, `revalidate = 300`. Admin saves call `revalidatePath()` / `revalidateTag('products')` so changes show up immediately.
- **Cart:** Zustand stores only `{productId, warehouseCode, qty}`. The cart page fetches current prices server-side through a Server Action (`getCartQuote`).
- **Checkout:** `placeOrder` Server Action runs: Zod validate → rate limit → honeypot check → load prices for the warehouse → verify stock and country → transaction (insert order + items + event) → send 2 emails (failure logged, not thrown) → redirect to `/order/[number]?t=<token>`.
- **Order page access:** the token is an HMAC of the order number keyed with `AUTH_SECRET`, so nobody can enumerate orders.

## Decisions
| # | Decision | Reason |
|---|---|---|
| D1 | SQLite over Postgres | Single server, tiny dataset, zero ops. Can move to Postgres later through Drizzle. |
| D2 | JSON columns for product content | Displayed, not queried. Saves hours of modelling. |
| D3 | One warehouse per cart | Mirrors how warehouses dispatch. Avoids split shipments in v1. |
| D4 | Guest checkout + order lookup | Accounts are v2. Lookup covers "where is my order". |
| D5 | Manual payment confirmation | Matches the current business process. No PSP fits the vertical. |
| D6 | Keep slugs and `.html` URLs | SEO and customer bookmarks |
