# 06 — Design System (look-alike spec)

**Goal: pixel-close to the live site.** Reference screenshots are in `_capture/screens/`. When in doubt, open the live page in the browser and sample computed styles. Don't invent new styling.

## Tokens (sampled from the live CSS on 2026-11-20)
Defined once in `src/app/globals.css` (Tailwind v4 `@theme`).

```css
/* storefront ("mall") */
--mall-bg: #f3f8fb;      --mall-ink: #10232d;     --mall-muted: #5f7380;
--mall-line: #d7e5ec;    --mall-panel: #ffffff;   --mall-panel-soft: #edf7fa;
--mall-green: #0f8f88;   --mall-teal: #2563a6;    --mall-amber: #c9822f;
--mall-clay: #a3513c;    --mall-shadow: 0 18px 46px #112d381c;

/* product detail ("pd") */
--pd-bg: #f6f8f9;        --pd-ink: #10212a;       --pd-muted: #63737d;
--pd-soft: #eef6f5;      --pd-surface: #ffffff;   --pd-line: #dfe9e8;
--pd-teal: #087a73;      --pd-teal-dark: #066d67; --pd-blue: #285f91;
--pd-coral: #e76f51;     --pd-gold: #d99a32;
--pd-shadow: 0 18px 52px #15343c12;  --pd-radius: 8px;

/* sampled computed colours */
--body-bg: #f4f6f8;      --body-ink: #16212c;
--navy: #0b1e40;         /* header links, card headings, announcement bar */
--navy-btn: #071b3b;     /* primary button bg */
--footer-bg: #162734;
```
Still to sample during the build (open the live page): Add-to-cart yellow, sale-price red, "In stock"/"OUT STOCK" badge colours, amber label-pill background.

## Typography
| Use | Font | Size / weight |
|---|---|---|
| Body | **Inter** (`next/font/google`) | 16px / 400; small copy 13–14px, line-height 1.6 |
| Display headings (hero, section titles, card titles) | **Georgia**, serif (system) | H1 ≈ 44px / 700 / lh 1.1; section H2 ≈ 40px / 700; card H3 19–24px / 600–700 |
| Product page headings, "A closer look" | Inter | 700 |
| Buttons | Inter | 13px / 600 |
| Eyebrow labels ("WAREHOUSE", "TRANSPORT") | Inter | 11–12px / 700, uppercase, letter-spacing .08em |

## Layout & components (from the screenshots)
- **Announcement bar.** Full-width navy, info icon, bold yellow title, single-line white text truncated with an ellipsis.
- **Header.** Floating white **pill** (radius ~16px, soft shadow) inset 24px. Logo and wordmark on the left. Centre: warehouse links (bold name + small grey "Ships to…" line), Affiliate, COA. Right: search, account and cart icons (lucide). Sticky under the announcement bar.
- **Home hero.** Background lab photo. Left: large navy translucent panel (radius ~24px) with H1, serif sub-headline, paragraph and two buttons (filled navy, outline white). Right: three stacked translucent cards with an amber pill label (TRANSPORT / CUSTOMS / QUALITY).
- **Section card.** White or very light panel, radius 24px, 1px line border.
- **Numbered cards** (supply model). White cards with a dark top border, a navy number circle, serif title, muted body, divider and "Result:" line.
- **Feature cards** (supply assurance). Icon tile, amber full-width pill label, serif title, amber-bullet list, divider and "Outcome:" line.
- **Product card** (warehouse grid). White card, square image, "In stock" (light) or "OUT STOCK" (red text) badge top-right, name bold, **sale price red + list price struck grey**, full-width yellow "Add to cart" button, or a disabled grey "OUT STOCK" button.
- **Product page.** Breadcrumb. Left: image plus title block (H1, spec, description, stars + ratings + answered questions + SKU, tag pills). Right sticky buy box: price, "Ships from" warehouse card with stock badge, delivery-country select, spec, yellow Add to Cart, outline Buy Now, "Secure checkout". Below: specs table (Form, Knowledge source, Research focus, Reconstitution, Storage, COA link). Then a tab bar (Overview, Research, Dosing & Protocol, Side Effects, COA & Testing, Reviews – N, Q&A – N, About) followed by the stacked section panels.
- **Footer.** Dark `#162734`. Logo and "FOR RESEARCH USE ONLY", email, phone, RUO disclaimer paragraph, © line. Columns: Support (Contact us, Account, Calculator, FAQ, Delivery tracking) and Quick links (About, Buy peptides, COA results, Fees, Terms).
- **Calculator.** Green-accented hero card with a WhatsApp button, left tab list, form grid, dark results panel.

## Rules
- Mobile first. Match the live site's mobile breakpoints by checking it at 390px wide.
- No new colours or fonts outside this file.
- Admin UI uses shadcn/ui defaults with `--navy` as primary. It doesn't need to look like the storefront.
