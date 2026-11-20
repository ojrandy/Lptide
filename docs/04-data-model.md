# 04 — Data Model

SQLite (`node:sqlite`) through Drizzle ORM's `sqlite-proxy` driver. The schema lives in `src/db/schema.ts`, migrations in `drizzle/`. The DB file is at `DATABASE_PATH` (default `./data/lppeptide.db`). The connection opens with `PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000`.

## Conventions
- **Money is stored as integer cents.** It is formatted only in the UI.
- Timestamps are integer ms (`integer({ mode: 'timestamp_ms' })`).
- Rich product content (glance items, detail sections, Q&A, reviews) is stored as **JSON columns**. v1 shows it and edits it as a whole; normalise only when v2 needs to query it.
- Product IDs keep the legacy IDs (26001…) so captured data and old links map 1:1.

## Tables

```
categories
  id            int PK            -- legacy id
  slug          text unique       -- weight-loss-metabolic
  name          text
  heroTitle     text
  description   text
  introMd       text              -- markdown "categoryIntro"
  sort          int

warehouses
  code          text PK           -- CNFC | USFC | AUSFC
  name          text              -- "Worldwide Warehouse"
  tagline       text              -- "Ships to all other countries worldwide"
  countries     text(json)        -- ["US","GB",...]
  shippingRule  text(json)        -- {mode: per_item|per_weight, firstCents, additionalCents, stepGrams, overrides{country}}; live Shipping Policy rates, admin-editable
  active        bool
  sort          int

products
  id            int PK            -- legacy id 26001...
  slug          text unique       -- retatrutide-10mg-rt10  (URL: /peptide/{slug}.html)
  name, shortName, subtitle, description          text
  categoryId    int FK -> categories
  sku           text              -- catalogCode, e.g. RT10
  specification, packageSize      text
  amountMg      real, weightKg real
  images        text(json)        -- ["/uploads/products/....jpg"]
  coaUrl        text null
  tags          text(json)        -- ["Best Sellers", ...]
  rating        real, reviewCount int, qaCount int   -- display values as on live site
  glance        text(json)        -- [{label,value,linkUrl}]
  sections      text(json)        -- [{key,label,blocks:[{heading,body,imageUrl}]}]
  qa            text(json)        -- [{question,answer}]
  reviews       text(json)        -- [{authorName,rating,title,content,date}]
  ratingBreakdown text(json)
  enabled       bool
  sort          int
  createdAt, updatedAt

product_prices                    -- price + stock PER WAREHOUSE
  productId     int FK            ┐ composite PK
  warehouseCode text FK           ┘
  priceCents    int               -- sale price shown (e.g. 6400)
  listCents     int               -- struck-through price (e.g. 8000)
  inStock       bool

orders
  id            int PK autoinc
  number        text unique       -- LP-2611-4821 (human-friendly, non-sequential suffix)
  status        text              -- see state machine
  warehouseCode text FK
  email, name, phone              text
  country, addressLine1, addressLine2, city, region, postalCode  text
  customerNote  text
  subtotalCents, shippingCents, handlingCents, totalCents   int
  trackingNumber text null, carrier text null
  adminNote     text
  ip            text              -- abuse tracing only
  createdAt, updatedAt

order_items
  id            int PK
  orderId       int FK
  productId     int
  sku, name, specification        text   -- SNAPSHOT at order time
  unitCents     int                      -- SNAPSHOT
  listCents     int
  qty           int
  lineCents     int

order_events                      -- audit trail of status changes
  id, orderId, fromStatus, toStatus, note, adminId, createdAt

admins
  id, email unique, passwordHash, createdAt, lastLoginAt

settings                          -- key/value
  key text PK, value text(json)
  -- announcement {enabled,title,text}
  -- paymentInstructions (markdown)
  -- contact {email,phone,telegram,telegramAdmins[],whatsapp}
  -- storeInbox (email that receives order notifications)
  -- checkout {handlingPercent: 5, minimumOrderCents: 19900, paymentNote}
  -- hotProducts [productId…]  (home "hot products" order)
  -- coaCertificates [{sku, report, recordId, title, file}]  (COA library)
```

## Order status machine
```
PENDING_PAYMENT ──► PAID ──► PROCESSING ──► SHIPPED ──► DELIVERED
       │              │            │
       └──────────────┴────────────┴──► CANCELLED
```
- Each transition writes one `order_events` row.
- `SHIPPED` requires a `trackingNumber` and sends the "shipped" email.

## Server-side rules (non-negotiable)
1. **Re-price on the server.** Checkout ignores client prices. It loads `product_prices` for the cart's warehouse and rejects unavailable items.
2. **Snapshot** name, SKU and prices into `order_items`. Later product edits never change past orders.
3. **One warehouse per order.** The destination country must be in `warehouses.countries`.
4. Totals (`src/lib/pricing.ts`, same rules as the live cart): `subtotal = Σ line`; `shipping` from the warehouse `shippingRule` (US/AU: first item + per extra item; Asia: per 0.5 kg step, US override; missing weight = 0.075 kg); `handling = ceil(handlingPercent% × (subtotal + shipping))` to whole dollars; `total = subtotal + shipping + handling`; order refused if `total < minimumOrderCents`. Checked by `npm run check:pricing`.

## Seed
`npm run db:seed` reads `_capture/` and is idempotent (upsert):
- categories ← `site/config.json`
- warehouses ← `site/warehouses.json` (+ taglines)
- products ← `products/detail/*.json`, with the content fixes applied (doc 01)
- product_prices ← `products/warehouse-prices.txt`, and stock ← `warehouseAvailability`
- settings ← `site/notices.json`, `site/site-context.json`
- admin ← `ADMIN_EMAIL` / `ADMIN_PASSWORD` env, only on first seed
