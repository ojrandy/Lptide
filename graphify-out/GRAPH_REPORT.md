# Graph Report - lppeptide  (2026-11-21)

## Corpus Check
- 246 files · ~335,590 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 20 file(s) not represented in the graph (top: .css 17, .example 1, (none) 1)

## Summary
- 1074 nodes · 2508 edges · 71 communities (58 shown, 13 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 124 edges (avg confidence: 0.86)
- Token cost: 482,938 input · 0 output

## Community Hubs (Navigation)
- Admin Layout & Framework Deps
- Store Layout & COA Pages
- Admin Orders & Products Pages
- Content Page Routes
- Zod Server Actions & Product Forms
- Calculator Pages
- Order Status & Admin Order Actions
- Seed & Admin Scripts
- Cart & Checkout Pages
- Captured Help Pages
- Home Videos, Footer & Product Top (screens)
- Admin Nav & Auth
- Order Creation & Cart Quote
- Node Scripts & Backups
- Initial DB Migration
- Dev Dependencies
- Product Page & Warehouse Grid (screens)
- Phase Plan, Migrate & Smoke
- Admin Settings UI
- DB Schema Types
- TypeScript Config
- Home Hero & Supply Sections (screens)
- COA Library Content
- COA, Calculator & Cart (screens)
- Project Rules & Scope
- Runtime Dependencies
- Settings Actions
- npm Scripts
- Checkout & Order Lookup Actions
- Catalog Cards & Product Claims
- Order Flow Design Decisions
- Admin Auth & Routing Design
- Admin Login & Order Forms
- About Page Content
- Data Model Rules
- Pricing & Shipping Rules
- Catalog Data Discrepancies
- Parity Checker
- URL & Slug Parity
- Look-alike Design Rules
- Customer Login & Account
- Product Families
- Order Storage & Emails Design
- Content Source & Fixes
- SQLite & Pure-JS Stack
- Deployment Architecture
- SEO, Backups & Launch
- Affiliate Program Content
- ESLint Config
- Calculator Content
- Promo & Scene Images
- Upload Handling
- Affiliate Page
- Country List
- Terms Content
- Capture Summary Notes
- esbuild Allow-scripts
- Brand Logos
- Client Blockers & DNS
- Drizzle Config
- Admin Overview KPIs
- Live-Site Crawling
- Next.js 16 Stack
- Tailwind 4
- Announcement Bar Token
- Footer Token
- Typography Tokens

## God Nodes (most connected - your core abstractions)
1. `next` - 74 edges
2. `requireAdmin()` - 42 edges
3. `react` - 36 edges
4. `getSettings()` - 33 edges
5. `formatCents()` - 32 edges
6. `getWarehouses()` - 26 edges
7. `ProductPage()` - 23 edges
8. `Button()` - 22 edges
9. `lucide-react` - 19 edges
10. `COA analytical library (24 reports by SKU and batch)` - 19 edges

## Surprising Connections (you probably didn't know these)
- `placeOrder Checkout Flow` --implements--> `placeOrder()`  [INFERRED]
  docs/02-architecture.md → src/lib/actions/checkout.ts
- `Folder Layout` --references--> `requireAdmin()`  [EXTRACTED]
  docs/02-architecture.md → src/lib/auth.ts
- `P4 Cart, Checkout, Emails` --references--> `placeOrder()`  [EXTRACTED]
  prompt.md → src/lib/actions/checkout.ts
- `Mutations Are Zod-Parsed Server Actions` --references--> `requireAdmin()`  [EXTRACTED]
  CLAUDE.md → src/lib/auth.ts
- `Admin Auth (lp_admin JWT cookie)` --references--> `requireAdmin()`  [EXTRACTED]
  docs/07-admin-dashboard.md → src/lib/auth.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Checkout / order capture flow** — docs_02_architecture_place_order_flow, src_lib_actions_checkout_placeorder, docs_04_data_model_server_repricing, docs_04_data_model_order_items, docs_08_security_and_deployment_rate_limits, docs_07_admin_dashboard_emails [INFERRED 0.85]
- **Admin authorization layers** — src_proxy, src_lib_auth_requireadmin, docs_07_admin_dashboard_admin_auth, docs_03_tech_stack_jose_bcryptjs [EXTRACTED 1.00]
- **URL parity mechanisms** — docs_05_routes_and_seo_url_parity, docs_02_architecture_d6_keep_slugs_html, docs_09_project_tracker_single_hop_redirects, docs_05_routes_and_seo_product_route, scripts_smoke [INFERRED 0.85]
- **Three-warehouse fulfillment model (stock, prices, shipping rules per warehouse)** — _capture_summary_cnfc_warehouse, _capture_summary_usfc_warehouse, _capture_summary_ausfc_warehouse, _capture_pages_help__shipping_us_warehouse_rate, _capture_pages_help__shipping_australia_warehouse_rate, _capture_pages_help__shipping_asia_warehouse_rate, _capture_products_warehouse_prices_warehouse_prices, _capture_pages_home_hot_products_by_warehouse [INFERRED 0.85]
- **Research-use-only positioning across the site** — _capture_pages_home_research_use_disclaimer, _capture_pages_legal__terms_research_use_notice, _capture_pages_reconstitution_calculator_disclaimer, _capture_pages_category__weight_loss_metabolic_research_use_note, _capture_pages_about_core_standards [INFERRED 0.85]
- **Affiliate commission lifecycle** — _capture_pages_affiliate_program_qualification, _capture_pages_affiliate_program_commission, _capture_pages_affiliate_program_hold_period, _capture_pages_affiliate_program_withdrawal, _capture_pages_affiliate_program_controls [EXTRACTED 1.00]
- **Home page top-to-bottom sections: hero, supply model, supply assurance** — _capture_screens_01_home_hero_hero_banner, _capture_screens_02_home_supply_model_supply_model_section, _capture_screens_03_home_supply_assurance_supply_assurance_section [INFERRED 0.85]
- **Shared card language: serif title, gold tag, gold bullets, outcome footer** — _capture_screens_01_home_hero_serif_display_headings, _capture_screens_01_home_hero_gold_pill_tag, _capture_screens_02_home_supply_model_gold_bullet_list, _capture_screens_03_home_supply_assurance_outcome_footer [INFERRED 0.85]
- **Product buy-box purchase flow: price, ships-from warehouse, delivery country** — _capture_screens_06_product_top_sale_price, _capture_screens_06_product_top_ships_from_card, _capture_screens_06_product_top_country_select, _capture_screens_06_product_top_buy_box [EXTRACTED 1.00]
- **Global site chrome: announcement bar, floating header, dark footer** — _capture_screens_04_home_videos_announcement_bar, _capture_screens_04_home_videos_floating_header, _capture_screens_05_footer_dark_footer [INFERRED 0.85]
- **Product detail page layout: spec table + purchase panel + tabbed content sections** — _capture_screens_07_product_specs_tabs_spec_table, _capture_screens_07_product_specs_tabs_purchase_panel, _capture_screens_07_product_specs_tabs_tab_bar, _capture_screens_08_product_sections_section_card [INFERRED 0.85]
- **Product card anatomy: stock badge, sale pricing, add-to-cart CTA** — _capture_screens_09_warehouse_grid_product_card, _capture_screens_09_warehouse_grid_stock_badge, _capture_screens_09_warehouse_grid_sale_pricing, _capture_screens_09_warehouse_grid_add_to_cart_button [EXTRACTED 1.00]
- **Shared storefront chrome (announcement bar + floating header) across COA, calculator and cart pages** — _capture_screens_10_coa, _capture_screens_11_calculator, _capture_screens_12_cart_empty, _capture_screens_10_coa_announcement_bar, _capture_screens_10_coa_site_header [EXTRACTED 1.00]
- **Reconstitution calculator flow: tool tab -> input form -> results panel** — _capture_screens_11_calculator_tool_sidebar_tabs, _capture_screens_11_calculator_reconstitution_form, _capture_screens_11_calculator_results_panel [INFERRED 0.85]
- **LPPEPTIDE logo variants share one mark** — public_brand_lppeptide_logo_center_logo_hexagon, public_brand_lppeptide_logo_disc_logo_disc, public_brand_lppeptide_logo_center_lp_monogram [EXTRACTED 1.00]
- **Lab/production scene imagery for storefront sections** — public_scenes_scene_lab_center_lab_scene, public_scenes_scene_production_vials_production_scene, public_scenes_scene_lab_center_lab_quality_imagery [INFERRED 0.75]

## Communities (71 total, 13 thin omitted)

### Community 0 - "Admin Layout & Framework Deps"
Cohesion: 0.05
Nodes (94): next, react, inter, metadata, SITE, SITE, sitemap(), STATIC_PAGES (+86 more)

### Community 1 - "Store Layout & COA Pages"
Cohesion: 0.05
Nodes (59): lucide-react, GlobalNotFound(), inter, metadata, inter, metadata, StoreLayout(), viewport (+51 more)

### Community 2 - "Admin Orders & Products Pages"
Cohesion: 0.12
Nodes (35): AdminOrderPage(), metadata, AdminOrdersPage(), metadata, AdminOverviewPage(), AdminProductsPage(), metadata, OrderDetails() (+27 more)

### Community 3 - "Content Page Routes"
Cohesion: 0.11
Nodes (26): AboutPage(), metadata, ContactPage(), metadata, FaqPage(), metadata, FeesPage(), metadata (+18 more)

### Community 4 - "Zod Server Actions & Product Forms"
Cohesion: 0.15
Nodes (29): Zod Validation, AdminProductPage(), metadata, BasicsForm(), CoaUpload(), ContentEditor(), dollars(), ImageManager() (+21 more)

### Community 5 - "Calculator Pages"
Cohesion: 0.17
Nodes (22): metadata, Page(), metadata, Page(), metadata, Page(), CalculatorShell(), TABS (+14 more)

### Community 6 - "Order Status & Admin Order Actions"
Cohesion: 0.17
Nodes (24): ORDER_STATUSES, orderEvents, OrderStatus, noteSchema, resendOrderEmail(), resendSchema, statusSchema, updateOrderStatus() (+16 more)

### Community 7 - "Seed & Admin Scripts"
Cohesion: 0.11
Nodes (23): bcryptjs, zod, input, bySort(), categoryIn, COZE_FIXES, excludedSet(), fixName() (+15 more)

### Community 8 - "Cart & Checkout Pages"
Cohesion: 0.16
Nodes (17): CartPage(), metadata, CheckoutPage(), metadata, CartView(), shippingLabel(), useQuote(), CheckoutForm() (+9 more)

### Community 9 - "Captured Help Pages"
Cohesion: 0.11
Nodes (22): FAQ page (/help/faq/), FAQ: Ordering (checkout from account, reorder from history), FAQ: Shipping after payment and documentation review, FAQ: Support contact details to include, Fees & payment overview page (/help/fees/), Order not paid until payment confirmed in order record, Price and stock at checkout depend on selected warehouse and destination, Asia warehouse rate by weight: US $85 first 0.5kg, other $60, +$25 per 0.5kg (+14 more)

### Community 10 - "Home Videos, Footer & Product Top (screens)"
Cohesion: 0.11
Nodes (23): Navy announcement bar (Welcome to Lp / Telegram notice), A closer look section heading, Floating rounded white header pill (logo, Affiliate, COA, search/account/cart icons), Pale blue-grey section background, Home - A closer look videos section (screenshot), 4-column square video card grid with 'videos' captions (placeholders unloaded), Footer brand block (logo, LPPEPTIDE, FOR RESEARCH USE ONLY, email, phone), Copyright line (2026 LPPEPTIDE) (+15 more)

### Community 11 - "Admin Nav & Auth"
Cohesion: 0.15
Nodes (18): PanelLayout(), AdminNav(), ITEMS, changePassword(), dummy(), login(), loginSchema, logout() (+10 more)

### Community 12 - "Order Creation & Cart Quote"
Cohesion: 0.14
Nodes (19): getCartQuote(), CheckoutRules, CreatedOrder, createOrderSync(), linesStmt(), newOrderNumber(), OrderError, priceCart() (+11 more)

### Community 13 - "Node Scripts & Backups"
Cohesion: 0.13
Nodes (13): db, dbFile, dbOut, out, stamp, uploads, upOut, download() (+5 more)

### Community 14 - "Initial DB Migration"
Cohesion: 0.18
Nodes (20): `admins`, admins_email_unique, `categories`, categories_slug_unique, `order_events`, order_events_order_idx, `order_items`, order_items_order_idx (+12 more)

### Community 15 - "Dev Dependencies"
Cohesion: 0.13
Nodes (20): devDependencies, tailwindcss@4.3.3, @tailwindcss/turbopack@4.3.3, tsx@^4.23.15, @types/node@^24.19.2, @types/nodemailer@^8.0.2, @types/react@^19, @types/react-dom@^19 (+12 more)

### Community 16 - "Product Page & Warehouse Grid (screens)"
Cohesion: 0.15
Nodes (20): 07 Product Specs & Tabs screenshot, Navy Announcement Bar (Welcome / Telegram notice), View Certificate COA Link (teal), Floating Pill Header with Warehouse Nav, Overview Section (What is RT10?), Sticky Purchase Panel (spec, Add to Cart, Buy Now, Secure checkout), Product Spec Key/Value Table (Form, Knowledge source, Research focus, Reconstitution, Storage, COA), Product Content Tab Bar (Overview, Research, Dosing & Protocol, Side Effects, COA & Testing, Reviews, Q&A, About) (+12 more)

### Community 17 - "Phase Plan, Migrate & Smoke"
Cohesion: 0.17
Nodes (12): P0 Foundation: Schema, Seed, Tokens, drizzle-orm, BASE, Check, metadata, STATUS, db, globalForDb (+4 more)

### Community 18 - "Admin Settings UI"
Cohesion: 0.29
Nodes (18): AdminSettingsPage(), metadata, Action, AnnouncementForm(), CheckoutRulesForm(), Contact, ContactsForm(), HotProductsForm() (+10 more)

### Community 19 - "DB Schema Types"
Cohesion: 0.12
Nodes (16): Admin, categories, Category, GlanceItem, Order, OrderEvent, OrderItem, Product (+8 more)

### Community 20 - "TypeScript Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 21 - "Home Hero & Supply Sections (screens)"
Cohesion: 0.15
Nodes (18): 01-home-hero screenshot, Navy Announcement Bar (Telegram notice), Floating Rounded White Header (logo, Affiliate/COA nav, search/account/cart icons), Gold Uppercase Pill Tag / Eyebrow, Hero Banner: Research Peptides Supply (navy glass panel over lab photo), Hero CTAs: Browse all products (solid) + Understand the Supply Model (outline), Hero Side Info Cards (Transport / Customs / Quality with gold pill tags), Serif Display Headings (navy, bold) (+10 more)

### Community 22 - "COA Library Content"
Cohesion: 0.16
Nodes (17): COA analytical library (24 reports by SKU and batch), COA Certificates page (/coa/), What you can verify: batch identity, analytical evidence, research-use record, Anti-Aging & Longevity (category), DSIP (DS5/DS10), Epithalon 10mg (ET10), Glutathione 1500mg (GTT), Matcha (MC30/MC100) (+9 more)

### Community 23 - "COA, Calculator & Cart (screens)"
Cohesion: 0.17
Nodes (17): COA Certificates page screenshot, Dark navy announcement bar (Telegram warning notice), 3-column grid of Certificate of Analysis document thumbnails, COA search input (product, batch, or report number), COA hero: green eyebrow 'LPPEPTIDE ANALYTICAL LIBRARY', large heading, subtitle, Rounded floating site header with warehouse nav (Worldwide/US/AUS), Affiliate, COA, search/account/cart icons, 'What you can verify' 3-column feature cards (Batch identity, Analytical evidence, Research-use record), Reconstitution Calculator page screenshot (+9 more)

### Community 24 - "Project Rules & Scope"
Cohesion: 0.13
Nodes (14): LPPEPTIDE Rebuild (CLAUDE.md), v1 Deadline Sun 22 Nov 2026, v1 Scope, v2 Scope, Project Phases 0-4, v2 Backlog, Build Prompts (prompt.md), P3 Content Pages, COA, Calculator (+6 more)

### Community 25 - "Runtime Dependencies"
Cohesion: 0.12
Nodes (17): dependencies, bcryptjs@^3.0.3, drizzle-orm@^0.45.4, jose@^6.2.18, lucide-react@^1.77.0, next@16.4.6, nodemailer@^10.6.1, react@19.3.0 (+9 more)

### Community 26 - "Settings Actions"
Cohesion: 0.22
Nodes (13): firstIssue(), put(), saveAnnouncement(), saveCheckout(), saveContacts(), saved(), saveWarehouse(), toCents() (+5 more)

### Community 27 - "npm Scripts"
Cohesion: 0.13
Nodes (15): scripts, admin:create, assets:fetch, backup, build, check:pricing, db:generate, db:migrate (+7 more)

### Community 28 - "Checkout & Order Lookup Actions"
Cohesion: 0.28
Nodes (11): CheckoutState, FIELDS, placeOrder(), lookupOrder(), LookupState, orderPath(), orderToken(), secret() (+3 more)

### Community 29 - "Catalog Cards & Product Claims"
Cohesion: 0.23
Nodes (12): Catalog product card (SKU, stock, rating, tags, Add to Cart, Buy Now, sale/list price), Weight Loss & Metabolic category page, Category research-use note (navigation aid, not medical guidance), 2026 shelf guide to weight-loss and metabolic peptides, Factory hot products by warehouse (Asia / US / Aus), 5-Amino-1MQ (10AM/50AM), AOD 9604 (5AD/10AD), Cagrilintide (CGL5/CGL10) (+4 more)

### Community 30 - "Order Flow Design Decisions"
Cohesion: 0.15
Nodes (10): Cart Server Quote (getCartQuote), placeOrder Checkout Flow, Zustand Persisted Cart, Product Edit Screen, Environment Variables, Rate Limits (login, checkout) + Honeypot, Security Baseline v1, Security Headers (+2 more)

### Community 31 - "Admin Auth & Routing Design"
Cohesion: 0.16
Nodes (12): Folder Layout, jose + bcryptjs Admin Auth, admins Table, Admin Routes (noindex), Admin Auth (lp_admin JWT cookie), P5 Admin Dashboard, SESSION_COOKIE, canonicalPath() (+4 more)

### Community 32 - "Admin Login & Order Forms"
Cohesion: 0.29
Nodes (11): AdminLoginPage(), metadata, LoginForm(), CARRIERS, NoteForm(), ResendEmail(), StatusForm(), Button() (+3 more)

### Community 33 - "About Page Content"
Cohesion: 0.15
Nodes (12): About LPPEPTIDE page (/about/), Core standards (COA documentation, batch traceability, cold-chain aware fulfillment, research-use positioning), What makes us different (factory-direct, COA-focused, bulk support), Mission: make research product sourcing easier to verify, compare, repeat, Catalog page (/catalog/), Active communities (7000+ Telegram, WhatsApp, Discord), Hero: Research Peptides Supply, Home page (/) (+4 more)

### Community 34 - "Data Model Rules"
Cohesion: 0.17
Nodes (10): Warehouses CNFC / USFC / AUSFC, categories Table, Order Totals Rules (shipping, handling, minimum), product_prices Table, products Table, settings Key/Value Table, warehouses Table, Settings Screen (+2 more)

### Community 35 - "Pricing & Shipping Rules"
Cohesion: 0.23
Nodes (10): cases, t, ShippingRule, DEFAULT_ITEM_WEIGHT_KG, DEFAULT_SHIPPING_RULES, handlingCents(), orderTotals(), PricedLine (+2 more)

### Community 36 - "Catalog Data Discrepancies"
Cohesion: 0.22
Nodes (10): Catalog sort (Recommended, Name A-Z, Price) and category filter, CJC-1295 without DAC + Ipamorelin (CP10), Fragrance Intimate Lyophilized Balls (category), Ipamorelin 10mg (IP10), Kisspeptin (KS10), Performance & Growth (category), Captured product table (60 products, 6 categories, 24 with COA), Product URL pattern /peptide/{slug}.html (+2 more)

### Community 37 - "Parity Checker"
Cohesion: 0.25
Nodes (10): args, BASE, decode(), DYNAMIC, entities, KNOWN, main(), norm() (+2 more)

### Community 38 - "URL & Slug Parity"
Cohesion: 0.20
Nodes (6): Product Route /peptide/[slug].html, Storefront Routes, Single-Hop Redirects, nextConfig, securityHeaders, P2 Catalog, Warehouse, Product Pages

### Community 39 - "Look-alike Design Rules"
Cohesion: 0.20
Nodes (7): Floating Pill Header, Mall Storefront Tokens, Product Card, Products Quick Edit (per-warehouse price/stock), P1 Storefront Shell + Home, Admin Guide (Store Team), LPPEPTIDE Storefront + Admin README

### Community 40 - "Customer Login & Account"
Cohesion: 0.31
Nodes (6): metadata, Page(), metadata, Page(), OrderLookupForm(), OrderLookupPage()

### Community 41 - "Product Families"
Cohesion: 0.36
Nodes (9): ARA290 (ARA10), BPC 157 10mg (BC10), BPC+TB blends (BB10/BB20), GHK-CU (50mg/100mg), Glow blend TB+BPC+GHK 70mg (BBG70), Klow blend TB+BPC+KPV+GHK 80mg (BBKG80), KPV 10mg (KPV10), Repair & Healing (category) (+1 more)

### Community 42 - "Order Storage & Emails Design"
Cohesion: 0.22
Nodes (9): Nodemailer to Client SMTP, order_events Audit Trail, order_items Table (Snapshot), Order Status Machine, orders Table, Order Emails (store, customer, shipped), Orders List + Order Detail, Email Failed Events + Resend (+1 more)

### Community 43 - "Content Source & Fixes"
Cohesion: 0.25
Nodes (7): _capture Source of Truth, Content Fixes (Coze wording, AOD 9604), Idempotent Seed from _capture, Coze Wording Replacement at Seed, Parity Script (npm run parity), Smoke Script, npm Scripts Reference

### Community 44 - "SQLite & Pure-JS Stack"
Cohesion: 0.29
Nodes (5): Drizzle ORM sqlite-proxy, node:sqlite (DatabaseSync), Product Detail (pd) Tokens, Product Page Layout + Buy Box, Decisions Log

### Community 45 - "Deployment Architecture"
Cohesion: 0.29
Nodes (7): ISR Reads + revalidateTag, One App, One SQLite File, One Uploads Folder, PM2 + Caddy on VPS, Deploy Steps (migrate before build), VPS Hosting, Cache Components (use cache, cacheTag, updateTag), VPS Deploy Commands

### Community 46 - "SEO, Backups & Launch"
Cohesion: 0.33
Nodes (6): /es and /pt 302 to English, SEO Checklist, Nightly Backups, Launch Checklist, P6 SEO, Hardening, Deploy, backup.sh script

### Community 47 - "Affiliate Program Content"
Cohesion: 0.33
Nodes (5): Affiliate Program page (/affiliate-program/), 10% commission on net product value, 30-day commission hold period, Affiliate qualification: $3,000 cumulative valid order value, Withdrawal: 3 per month, minimum $100

### Community 48 - "ESLint Config"
Cohesion: 0.33
Nodes (5): eslintConfig, eslint@^9, eslint-config-next@16.4.6, eslint, eslint-config-next

### Community 49 - "Calculator Content"
Cohesion: 0.40
Nodes (5): Reconstitution calculator (mg, mL, mcg dose, syringe U-100/U-50/U-30/custom), Reconstitution Calculator page, Calculator research-use disclaimer, Research tool tabs (Reconstitution, Cost per Dose, Vial Duration, Product Lookup), BAC Water (BA3/BA10)

### Community 50 - "Promo & Scene Images"
Cohesion: 0.50
Nodes (5): Deals / limited-time bundles promotion, Research Deals banner (5MG vials, orange gradient), Laboratory / manufacturing quality imagery, Lab bench scene (flasks, molecule model, blank center), Cleanroom vial production scene (gloved hands, vial tray)

### Community 51 - "Upload Handling"
Cohesion: 0.40
Nodes (3): Kind, KINDS, MAX_UPLOAD_BYTES

### Community 53 - "Country List"
Cohesion: 0.40
Nodes (4): COUNTRIES, intl, NAMES, ORDER

### Community 54 - "Terms Content"
Cohesion: 0.50
Nodes (4): Legal contact legal@LPPEPTIDE.com, Terms: orders may be reviewed, declined, delayed or cancelled, Terms: products and research-use notice, Terms of Service page (/legal/terms/)

### Community 55 - "Capture Summary Notes"
Cohesion: 0.67
Nodes (3): LPPEPTIDE capture summary, Product detail field shapes (glanceItems, detailSections, qaItems, reviews), Detail section keys (overview, research, dosing, sideeffects, coa, about)

### Community 56 - "esbuild Allow-scripts"
Cohesion: 0.50
Nodes (4): allowScripts, esbuild@0.18.20, esbuild@0.25.12, esbuild@0.28.2

### Community 57 - "Brand Logos"
Cohesion: 0.83
Nodes (4): LPPEPTIDE brand identity (navy blue hexagon, gold wordmark), LPPEPTIDE Hexagon Logo (transparent), LP monogram with DNA helix and molecule mark (navy + gold/cream), LPPEPTIDE Logo Disc (circular badge)

### Community 58 - "Client Blockers & DNS"
Cohesion: 0.67
Nodes (3): Open Questions for Client, DNS Cutover (do not break email), Client Blockers B1-B6

## Ambiguous Edges - Review These
- `Retatrutide tagline '24% Weight Reduction in Clinical Trials'` → `Terms: products and research-use notice`  [AMBIGUOUS]
  _capture/pages/legal__terms.md · relation: conceptually_related_to
- `Hero Side Info Cards (Transport / Customs / Quality with gold pill tags)` → `Warehouse Products Error State (Retry warehouse products button, dashed box)`  [AMBIGUOUS]
  _capture/screens/02-home-supply-model.jpg · relation: conceptually_related_to
- `Quick links (About, Buy peptides, COA results, Fees, Terms)` → `Category pill tags (Best Sellers, Weight Loss, Metabolic)`  [AMBIGUOUS]
  _capture/screens/06-product-top.jpg · relation: conceptually_related_to
- `Rounded floating site header with warehouse nav (Worldwide/US/AUS), Affiliate, COA, search/account/cart icons` → `LPPEPTIDE Support chat widget (verified badge, language picker, FAQ quick questions, Products/Orders/COA/Fees shortcuts, message input)`  [AMBIGUOUS]
  _capture/screens/12-cart-empty.jpg · relation: conceptually_related_to

## Knowledge Gaps
- **80 isolated node(s):** `Live-Site Crawling Guidance`, `.eml Mail Fallback Without SMTP`, `V2-3 Payments & Fulfilment`, `V2-4 Affiliate Program`, `V2-5 Reviews, Q&A, i18n, Support` (+75 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 324 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `Admin Layout & Framework Deps` to `Store Layout & COA Pages`, `Admin Orders & Products Pages`, `Content Page Routes`, `Zod Server Actions & Product Forms`, `Calculator Pages`, `Order Status & Admin Order Actions`, `Cart & Checkout Pages`, `Admin Nav & Auth`, `Dev Dependencies`, `Phase Plan, Migrate & Smoke`, `Admin Settings UI`, `Runtime Dependencies`, `Settings Actions`, `Checkout & Order Lookup Actions`, `Admin Auth & Routing Design`, `Admin Login & Order Forms`, `URL & Slug Parity`, `Customer Login & Account`, `Affiliate Page`?**
  _High betweenness centrality (0.228) - this node is a cross-community bridge._
- **What connects `Live-Site Crawling Guidance`, `.eml Mail Fallback Without SMTP`, `V2-3 Payments & Fulfilment` to the rest of the system?**
  _80 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Admin Layout & Framework Deps` be split into smaller, more focused modules?**
  _Cohesion score 0.051274747187010396 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Admin Layout & Framework Deps` to `Admin Login & Order Forms`, `Store Layout & COA Pages`, `Admin Orders & Products Pages`, `Content Page Routes`, `Zod Server Actions & Product Forms`, `Calculator Pages`, `Cart & Checkout Pages`, `Customer Login & Account`, `Dev Dependencies`, `Phase Plan, Migrate & Smoke`, `Admin Settings UI`, `Runtime Dependencies`, `Checkout & Order Lookup Actions`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Should `Store Layout & COA Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.050286058416139714 - nodes in this community are weakly interconnected._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Retatrutide tagline '24% Weight Reduction in Clinical Trials'` and `Terms: products and research-use notice`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Hero Side Info Cards (Transport / Customs / Quality with gold pill tags)` and `Warehouse Products Error State (Retry warehouse products button, dashed box)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._