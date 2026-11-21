# 10 — v2 design (schema, routes, decisions)

Covers prompt.md V2-1 … V2-5. Written 2026-11-21 before coding (each V2 prompt asks for the schema and route
proposal first; the owner asked to do all of v2 in one go, so this doc is the proposal and the record).
All v2 schema changes are in one migration, `drizzle/0003_*`, which also moves existing data. Nothing in v1 URLs changes.

## What the live site actually does (checked 2026-11-21)
- `/es/...` and `/pt/...` show the **English** page and product content. Only the third-party support chat widget is
  translated. So v2 translates the store's UI strings (header, footer, cart, checkout, account, product buy box,
  forms). Page copy and product content stay English unless an admin enters a translation (per product,
  `product_translations`), and fall back to English otherwise. We do not machine-generate product content
  (CLAUDE.md: never invent product facts).
- The live chat widget is a third-party embed. v2 ships a first-party Telegram/WhatsApp/email support widget, with no
  third-party script.

## Decisions
| # | Decision | Why |
|---|---|---|
| V1 | Customer auth is in-house (jose JWT cookie `lp_customer`, bcryptjs, Google OpenID Connect code flow with PKCE, id_token verified with jose against Google's JWKS) instead of Auth.js. | Auth.js v5 is still beta, and its Drizzle adapter does not support the `sqlite-proxy` driver we must use (doc 09: node:sqlite). The admin already uses the same building blocks, so no new packages are needed. |
| V2 | Orders are linked to an account by email **only after the email is verified**: through the verification link, or by Google with `email_verified`. | Otherwise anyone could register with someone else's email and read their order history. |
| V3 | i18n is an in-house typed dictionary (`src/i18n/`) plus a `[lang]` root segment read with `next/root-params`, instead of next-intl. | next-intl 4.15 depends on `@swc/core` and `@parcel/watcher` (native addons). Windows Application Control blocks those on the dev machine (doc 09). Next 16 documents this exact pattern. |
| V4 | English stays unprefixed. `proxy.ts` rewrites `/x` → `/en/x` internally; `/es/x` and `/pt/x` are served as-is; `/en/x` 301 → `/x`. | Public URLs are unchanged (CLAUDE.md), and `/es` `/pt` now serve real pages instead of the v1 302. |
| V5 | Payment providers are **not** integrated. Payment methods are admin-editable (label, instructions). Each order gets a payment reference, and the admin marks it paid with an optional proof file. | The client has not confirmed a provider (B4). A crypto-invoice integration needs their account and API keys. The data model has a `paymentMethod` per order, so a provider can be added later. |
| V6 | Carrier tracking is links only (admin-editable carrier list with a URL template), plus a local lookup of tracking numbers. No carrier APIs. | No carrier accounts. This matches the live panel copy ("checks the local shipment record first"). |
| V7 | Stock becomes countable but optional: `product_prices.stockQty` (null = not counted, as in v1). Orders decrement it and cancellations put it back. Reaching 0 sets out-of-stock. Crossing the warehouse's `lowStockThreshold` emails the store inbox. | Low-stock alerts need quantities. Null keeps v1 behaviour for products nobody counts. |
| V8 | Reviews and Q&A move from JSON columns to tables (the migration copies them as `source='import'`, approved). The displayed rating and "N ratings" counts stay the stored display values (doc 01 open question 4). | The prompt asks for tables. The counts do not match the stored reviews on live either. |
| V9 | Proof-of-payment files are stored in `PRIVATE_DIR` (default `./data/private`), never under `UPLOAD_DIR`, and are served only by an admin-gated route. | `/uploads/*` is public. |
| V10 | Shipping: the first active rule (by `sort`) that matches warehouse, country, weight band and item-count band prices the order. No matching rule means the cart cannot be ordered, with a clear message. The migration converts every v1 warehouse rule (and its country overrides) into rules, so fees are unchanged on day one. | "Replace the flat fee with rules", existing orders unaffected (their amounts are snapshots). |

## Schema (migration 0003)
```
customers            id, email unique (lowercase), name, passwordHash null, googleSub unique null,
                     emailVerifiedAt null, createdAt, lastLoginAt
customer_addresses   id, customerId FK cascade, label, name, phone, country, addressLine1, addressLine2, city,
                     region, postalCode, isDefault, createdAt
customer_carts       customerId PK FK cascade, warehouseCode null, lines json [{productId, qty}], updatedAt
orders  (+)          customerId null FK set null, paymentMethod text '', paymentRef text unique null,
                     paidAt null, paymentProof text null, affiliateId null FK set null, locale text 'en'
shipping_rules       id, warehouseCode FK, name, countries json [] (empty = every country the warehouse serves),
                     minGrams 0, maxGrams null, minItems 1, maxItems null,
                     mode flat|per_item|per_weight, firstCents, additionalCents, stepGrams,
                     freeOverCents null (subtotal ≥ → free), sort, active
warehouses (+)       lowStockThreshold int 5
product_prices (+)   stockQty int null
affiliates           id, customerId FK unique, code unique, status PENDING|APPROVED|REJECTED|SUSPENDED,
                     commissionPercent int 10, website, audience, payoutDetails, adminNote, createdAt, decidedAt
affiliate_clicks     id, affiliateId FK cascade, landingPath, createdAt
affiliate_commissions id, affiliateId FK, orderId FK unique, baseCents (order subtotal), percent, amountCents,
                     status EARNED|PAID|VOID, payoutId null, createdAt
affiliate_payouts    id, affiliateId FK, amountCents, method, reference, note, adminId, createdAt
product_reviews      id, productId FK cascade, customerId null, orderId null, authorName, rating 1-5, title, content,
                     reviewDate (YYYY-MM-DD), verified, status PENDING|APPROVED|REJECTED, source import|customer,
                     sort, createdAt
product_questions    id, productId FK cascade, customerId null, authorName, email, question, answer,
                     status PENDING|APPROVED|REJECTED, source import|customer, sort, createdAt, answeredAt
product_translations productId FK cascade + locale (PK), name, subtitle, description
products (−)         reviews, qa columns dropped after the copy
settings (+ keys)    paymentMethods [{id,label,instructions,enabled}], carriers [{code,name,trackingUrl}]
```

## Routes
Storefront. Every page below also exists under `/es` and `/pt`.
| Path | What |
|---|---|
| `/login/` | Sign in (email + password, Google) + the v1 order lookup |
| `/register/` | Create an account (verification email) |
| `/forgot-password/`, `/reset-password/?t=` | Password reset by email link (1 hour) |
| `/account/` | Signed in: order history, addresses, affiliate entry. Signed out: same page as `/login/` (v1 behaviour) |
| `/account/verify/?t=` | Email verification; links past orders |
| `/account/affiliate/` | Apply (form) or the affiliate dashboard (link, clicks, orders, commission, payouts) |
| `/auth/google/`, `/auth/google/callback/` | OAuth route handlers (not localised, not indexed) |
| `?ref=CODE` on any page | Sets `lp_ref` (30 days), counts one click per new cookie |
| `/help/shipping/#track-order` | Order numbers → order lookup. Tracking numbers → local record (status + carrier link) or the carrier page |

Admin (all gated by `requireAdmin()`):
| Path | What |
|---|---|
| `/admin/shipping/` | Rules CRUD per warehouse + "preview a cart" tester |
| `/admin/affiliates/`, `/admin/affiliates/[id]/` | Applications, approve/reject, commission %, commissions, payout log |
| `/admin/reviews/` | Moderation queue: reviews and questions (approve, reject, answer, delete) |
| `/admin/customers/` | Customer list (search, orders count) |
| `/admin/orders/[id]/proof/` | Serves the payment proof file (admin only) |
| `/admin/products/[id]` (+) | Stock quantities, translations (es/pt) |
| `/admin/settings/` (+) | Payment methods, carriers, low-stock threshold per warehouse |

## Server rules added
- Checkout: payment method must be an enabled one. `paymentRef` = `LP` + 8 random chars (unique). Shipping comes from
  the rules engine. Stock is checked and decremented in the same transaction. The affiliate comes from the `lp_ref`
  cookie, ignored when the order email is the affiliate's own. The customer id comes from the session.
- PAID transition: optional proof upload (jpg/png/webp/pdf ≤ 5 MB, signature-checked) and a transaction note. It
  creates the affiliate commission (percent × subtotal; never on shipping or handling).
  CANCELLED: voids an unpaid commission and returns counted stock.
- Reviews: only a signed-in customer with a PAID-or-later order containing the product can submit (verified = true).
  One review per product per customer. Questions: anyone, with honeypot and rate limit. Everything starts PENDING.
- Every new action: Zod → (requireAdmin | requireCustomer where relevant) → rate limit for public forms.
