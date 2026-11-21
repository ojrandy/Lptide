# LPPEPTIDE storefront + admin

Rebuild of https://lppeptide.com, served at **https://lppeptide.co** (contact info@lppeptide.co): a look-alike storefront (same URLs, copy, products and prices), order capture with
email notifications, and an admin dashboard. One Next.js 16 app, one SQLite file, one uploads folder.
Project docs live in [`docs/`](docs/) (start with `01-project-brief.md` and `09-project-tracker.md`).

## Quick start (development)

Needs Node 24+ (uses the built-in `node:sqlite`).

```bash
npm ci
cp .env.example .env.local          # set AUTH_SECRET (openssl rand -base64 48); SMTP can stay empty in dev
npm run db:migrate
npm run db:seed                     # imports _capture/ (idempotent). Set ADMIN_EMAIL/ADMIN_PASSWORD first to create the admin
npm run assets:fetch                # product images + COA files from the live site (only while it is still online)
npm run dev                         # http://localhost:3000 (store), /admin (dashboard)
```

Without SMTP settings, emails are saved as `.eml` files in `data/mail/` so you can open them in any mail client.

## Scripts

| Script | What it does |
|---|---|
| `dev` / `build` / `start` | Next.js. **Run `db:migrate` before `build`**: pages are prerendered from the database. |
| `typecheck` / `lint` | Must pass before a task is done (with `build`). |
| `db:generate` / `db:migrate` | Drizzle migrations (`drizzle/`), applied with the node:sqlite migrator. |
| `db:seed` | Imports `_capture/`. Re-running keeps admin edits to shipping rules, checkout rules and payment text. |
| `admin:create -- <email> <password>` | Creates an admin or resets a password (12+ characters). |
| `assets:fetch` | Downloads product images and COA files into `UPLOAD_DIR` (skips existing files). |
| `smoke -- <url>` | URL-parity and safety checks (all product URLs, redirects, 404s, admin gate). |
| `check:pricing` | Shipping / handling / minimum rules against the examples published on the live site, plus the v2 rules engine. |
| `check:v2` | v2 business rules end to end on a throwaway copy of the database (stock, payment reference, referrals, commissions, account linking). |
| `backup` | Consistent DB snapshot + uploads archive into `BACKUP_DIR` (default `./backups`), 14 days kept. |

## Deploy (VPS)

Full steps, DNS cutover and launch checklist: [`docs/08-security-and-deployment.md`](docs/08-security-and-deployment.md).

```bash
# first deploy, before the DNS cutover
npm ci && npm run db:migrate && npm run db:seed && npm run assets:fetch && npm run build
pm2 start npm --name lppeptide -- start && pm2 save
# every later deploy
git pull && npm ci && npm run db:migrate && npm run build && pm2 reload lppeptide
# nightly backup (crontab): 15 3 * * * cd /srv/lppeptide/app && ./scripts/backup.sh
```

Keep `data/`, `uploads/` and `backups/` outside the release directory (`DATABASE_PATH`, `UPLOAD_DIR`, `BACKUP_DIR`).

## Admin guide (for the store team)

Sign in at **/admin**. Sessions last 8 hours.

**Orders.** New orders arrive as *Pending payment*, and the store inbox gets an email for each one.
1. When the payment arrives, open the order and choose **Mark as Paid**. Add the payment reference as a note.
2. **Processing** while it is being packed.
3. **Shipped**: choose the carrier and enter the tracking number. The customer gets an email with the tracking number.
4. **Delivered** when it arrives. **Cancel** is possible until the order ships.

The internal note is never shown to the customer. If an email failed, the timeline says "Email failed" and the **Emails**
box lets you resend it. **Copy** copies the shipping address.

**Products.** The products list shows each warehouse's sale price, list price (shown struck through) and stock. Edit them
and press **Save**: the store updates at once. Untick *Sold here* to stop selling a product from a warehouse, and use
**Visible/Hidden** to hide a product completely. Open a product to edit its texts and tags, upload images (JPG, PNG or
WebP, up to 5 MB; the newest becomes the main image) or add a certificate (PDF, JPG or PNG), which then appears in the
COA library. The page address (slug) can't be changed, so old links keep working.

**Settings.** Announcement bar, payment instructions (shown to customers after they order), handling fee and order
minimum, each warehouse's shipping fees and countries, contact details and the store inbox, the order of the
"hot products" on the home page, and your password.

**v2 additions.**
- **Shipping**: one or more rules per warehouse. The first active rule (lowest order number) matching the country, weight and number of items sets the fee. Use **Preview a cart** to check before saving changes.
- **Paid orders**: attach the payment screenshot or PDF when you mark an order paid (only admins can open it). Customers quote the order's payment reference with their payment.
- **Stock**: leave the quantity empty to manage stock with the In stock tick as before; enter a number to have orders count it down. You get an email when it reaches the warehouse's alert level.
- **Customers** can create accounts; their orders and addresses appear in /account/. **Reviews & Q&A** wait in the admin until you publish them.
- **Affiliates**: approve applications, then record each payout after sending the money.
- **Languages**: the store is also at /es/ and /pt/. Product names and descriptions can be translated on the product page (optional).

## Notes

- Styling is the live site's own CSS (`src/styles/live/`, ported verbatim). Our additions are in `src/styles/store-extra.css`.
- Prices are always re-calculated on the server. The browser cart only holds product ids and quantities.
- Research use only: product content is reproduced from the live site; do not add medical claims.
