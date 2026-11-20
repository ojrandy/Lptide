# 07 — Admin Dashboard

Path `/admin`. Desktop first, usable on a phone. Built with small shadcn-style components in `src/components/admin/ui.tsx` (Tailwind only; see docs/09 decisions). Every mutation is a **Server Action** that re-checks the session.

## Auth
- `/admin/login` takes email and password. The password hash is bcrypt (cost 12).
- On success it sets the cookie `lp_admin`: a JWT (HS256, `jose`) signed with `AUTH_SECRET`, holding `{ sub: adminId }`. Attributes: httpOnly, Secure, SameSite=Lax, Path=/, 8h expiry.
- `proxy.ts` (Next 16's renamed middleware) redirects `/admin/*` to `/admin/login` when there's no valid token. **Every Server Action and admin page also calls `requireAdmin()`.** Proxy alone is not authorization.
- Login is rate limited: 5 failures per 15 min per IP + email, with a generic error message.
- Admins are created by the seed script or `npm run admin:create`. There's no sign-up page.

## Screens
### Overview `/admin`
- KPI cards: orders today, orders awaiting payment, revenue last 7 days (PAID and later), shipped last 7 days.
- Table of the 10 latest orders.

### Orders `/admin/orders`
- Table: number, date, customer, country, warehouse, items, total, status badge.
- Filters: status, warehouse, search (number, email, name). Paginated at 25.

### Order detail `/admin/orders/[id]`
- Customer, address (with a copy button), items with the snapshot prices, totals.
- Status control: only allowed transitions (doc 04). SHIPPED requires the tracking number and carrier, and sends the shipped email.
- Admin note (internal) and an event timeline.

### Products `/admin/products`
- Table: image, name, SKU, category, enabled toggle, and price + stock for each warehouse.
- **Quick edit** inline: per-warehouse sale price, list price and in-stock toggle. This is the most frequent task.

### Product edit `/admin/products/[id]`
- Basics: name, subtitle, description, category, SKU, specification, package size, tags, sort, enabled.
- Image upload (jpg, png or webp, ≤ 5 MB). Saved to `UPLOAD_DIR`, served from `/uploads/...`.
- COA URL or upload (pdf, jpg or png).
- Per-warehouse prices and stock.
- Content JSON (glance, sections, Q&A) in a validated JSON editor (textarea + Zod). A structured editor is v2.
- **Slug is read-only** (URL parity).

### Settings `/admin/settings`
- Announcement bar (on/off, title, text).
- Payment instructions (markdown), shown on the order confirmation page and in the customer email.
- Per-warehouse shipping rule (per item or per weight step, first/additional fee, country overrides), name, header line and active toggle.
- Checkout rules: handling fee %, order minimum, payment note.
- Home "factory hot products" order (SKUs).
- Contacts: store inbox email, support email, phone, Telegram link and admin handles, WhatsApp.
- Change own password.

## Emails (Nodemailer → client SMTP)
| Trigger | To | Content |
|---|---|---|
| Order placed | store inbox | order number, customer, address, items, totals, link to `/admin/orders/[id]` |
| Order placed | customer | order number, items, totals, payment instructions, link to the order page |
| Status → SHIPPED | customer | carrier + tracking number |

Email failures **never** fail the order. Log the error and show "email failed" on the order so an admin can resend.
