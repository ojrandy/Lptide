# 01 — Project Brief

## Context
LPPEPTIDE (https://lppeptide.com) is a research-peptide storefront. The client lost the source code of the current site, a Nuxt app with a custom backend. We are rebuilding it from scratch so existing customers find the same products, URLs and content.

## Deadline
- Start: Fri 20 Nov 2026
- **v1 delivered: Sun 22 Nov 2026, midday at the latest**

## Goal of v1
1. **Storefront that looks like the current site.** Same layout, copy, products, prices, URLs and SEO metadata.
2. **Admin dashboard.** Orders inbox, product and price management, site settings.
3. **Order capture.** Checkout creates an order in the DB and emails the store inbox and the customer. Payment is confirmed manually, as today ("An order is not treated as paid until the payment is confirmed in the order record", from /help/fees).

Full logistics (shipping rule engine, payment integrations, tracking automation) is **v2**.

## Constraints
- Next.js for both storefront and dashboard, in one app.
- **No third-party APIs** in v1. Orders go to the dashboard and to the client's mailbox over SMTP.
- Same content as today. Copy is cleaned only where it is clearly broken (see "Content fixes").
- Built by one developer in about 2 days. Anything not listed in v1 is out of scope.

## Source of truth
The live site was captured on 2026-11-20 into `/_capture`:
| Path | Content |
|---|---|
| `_capture/SUMMARY.md` | Product table: SKU, price, stock per warehouse, COA |
| `_capture/products/detail/*.json` | Full product content: glance specs, sections, Q&A, reviews |
| `_capture/products/warehouse-prices.txt` | **Per-warehouse sale and list prices** |
| `_capture/site/*.json` | Warehouses, categories, notices, contact, supply-model copy, videos, shipping countries |
| `_capture/pages/*.md` | Copy for the content pages |
| `_capture/screens/*.jpg` | Visual reference for the look-alike |

## Key facts about the current site
- **60 products** in 6 categories. One product is one SKU; there are no size variants (10 mg and 20 mg are separate products).
- **3 warehouses:** `CNFC` Worldwide, `USFC` US only, `AUSFC` Australia only. **Price and stock are per warehouse.** Every price is shown as a 20% discount off a struck-through list price.
- 24 products link a COA certificate.
- Contact: lppeptideofficial@lppeptide.com, +1 440 941 4499, Telegram t.me/lppeptide (@LP_Long, @LP_Zhong).
- Languages: en, es (`/es`), pt-BR (`/pt`).
- Google login and customer accounts exist on the current site.

## Scope
### v1 (this delivery)
- Announcement bar, header (warehouse menu, Affiliate, COA, search, account, cart) and footer.
- Pages: Home, Warehouse ×3, Catalog, Category, Best sellers, Product, COA library, Reconstitution calculator, Affiliate (content only), About, FAQ, Fees, Shipping, Terms.
- Cart (one warehouse per cart), checkout (guest), order confirmation page, order lookup (order number + email).
- Emails: new-order email to the store, confirmation to the customer, "shipped" email with tracking number.
- Admin: login, overview KPIs, orders (list, detail, status, tracking, notes), products (edit content, image, per-warehouse price and stock, enable or disable), settings (announcement, payment instructions, flat shipping fee per warehouse, contacts).
- SEO parity: titles, descriptions, canonical URLs, sitemap, robots, 301s.

### v2 (after delivery)
- Customer accounts and Google login, order history.
- Shipping rule engine (weight, country, item count), payment-method integrations, automated tracking.
- Affiliate program (applications, codes, commissions).
- Reviews and Q&A submission and moderation.
- Spanish and Portuguese locales.
- Support chat widget (the current one is a third-party embed).

## Content fixes (agreed minimal edits)
- Replace "Coze describes" with "The LPPEPTIDE knowledge record describes". The live frontend already does this on display; we bake it in at seed time.
- Fix obvious typos in product names, e.g. "AOD 9064" → "AOD 9604". Remove stray Chinese characters from display names. **Keep every slug unchanged.**

## Open questions for the client (do not block v1)
1. Which payment methods do customers use (Zelle, crypto, bank transfer…)? v1 shows editable instructions text.
2. Shipping fees per warehouse? v1 uses an editable flat fee per warehouse.
3. Keep the "Dosing & Protocol" and "Side Effects" sections? They weaken the research-use-only positioning. v1 keeps them, as on the live site.
4. Review counts such as "6,489 ratings" don't match the stored reviews. Keep showing them? v1 keeps them, as on the live site.
5. Hosting and DNS access, and the SMTP credentials for the mailbox.
