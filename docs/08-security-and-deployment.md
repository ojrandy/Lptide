# 08 — Security & Deployment

## Security baseline (v1, mandatory)
| Area | Control |
|---|---|
| Input | Every Server Action parses its input with Zod. Unknown fields are stripped. Lengths are capped. |
| Pricing | Server re-prices every order (doc 04). Client prices are never trusted. |
| AuthN | bcrypt (cost 12). JWT cookie: httpOnly, Secure, SameSite=Lax, 8h. `AUTH_SECRET` ≥ 32 random bytes. |
| AuthZ | `requireAdmin()` inside **every** admin page and action, not just in `proxy.ts` |
| CSRF | Server Actions (origin check built in). No custom POST API routes. |
| Abuse | Rate limits: login 5/15 min, checkout 5/10 min per IP. Honeypot field on checkout. |
| Uploads | MIME and extension allow-list (jpg, png, webp, pdf), ≤ 5 MB, random filenames, stored outside `src`, never executed |
| Output | React escaping. `react-markdown` without raw HTML (no `rehype-raw`). |
| Headers | `next.config.ts` `headers()`: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Permissions-Policy` minimal, HSTS through Caddy |
| Secrets | `.env.local` / server `.env` only. `.env.example` is committed with no values. |
| Admin | `noindex` on `/admin`, generic login errors, `lastLoginAt` recorded |
| Data | Store only the PII needed to ship. IP is kept for abuse tracing only. |

## Environment variables
```
DATABASE_PATH=./data/lppeptide.db
UPLOAD_DIR=./uploads
SITE_URL=https://lppeptide.co
AUTH_SECRET=                # openssl rand -base64 48
ADMIN_EMAIL=                # first admin (seed only)
ADMIN_PASSWORD=             # first admin (seed only)
SMTP_HOST=
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=info@lppeptide.co
SMTP_PASS=
MAIL_FROM="LPPEPTIDE <info@lppeptide.co>"
STORE_INBOX=info@lppeptide.co
PRIVATE_DIR=./data/private  # v2: payment proofs; outside the release dir, never under UPLOAD_DIR
GOOGLE_CLIENT_ID=           # v2: optional customer Google sign-in (redirect {SITE_URL}/auth/google/callback/)
GOOGLE_CLIENT_SECRET=
```

## Hosting
- **VPS:** 1 vCPU / 2 GB, Ubuntu 24.04 (Hetzner CX22 or a DigitalOcean basic droplet).
- Node 24 LTS, PM2 (`pm2 start npm --name lppeptide -- start`, `pm2 save`, `pm2 startup`), Caddy reverse proxy to :3000 with automatic HTTPS.
- `/etc/caddy/Caddyfile`: list **both** hostnames, so Caddy gets an HTTPS certificate for each. The app then 301s `www` to `SITE_URL` (src/proxy.ts), whichever form `SITE_URL` uses:
  ```
  lppeptide.co, www.lppeptide.co {
      encode zstd gzip
      header Strict-Transport-Security "max-age=31536000; includeSubDomains"
      reverse_proxy localhost:3000
  }
  ```
- Data paths outside the release dir: `/srv/lppeptide/data`, `/srv/lppeptide/uploads`.

## Deploy steps
1. `git pull && npm ci && npm run db:migrate && npm run build && pm2 reload lppeptide` (migrate **before** build: pages are prerendered from the DB at build time)
2. First deploy only: `npm run db:migrate && npm run db:seed && npm run assets:fetch` **before** the first build and before the DNS cutover (the live site is the only source of the product images), then sign in and change the admin password.

## DNS cutover (new domain lppeptide.co, do not break email)
The store moves from `lppeptide.com` to **`lppeptide.co`** (same name, same paths). Contact/sender address: `info@lppeptide.co`.
1. Get access to the DNS account of `lppeptide.co` (and the Cloudflare account of `lppeptide.com`).
2. `lppeptide.co`: point `A`/`AAAA` for the apex **and** `www` to the VPS (both are required: without the `www` record, www.lppeptide.co does not open). Proxy on, SSL mode **Full (strict)**. Set `SITE_URL=https://lppeptide.co`.
3. Email on `lppeptide.co`: create the `info@lppeptide.co` mailbox, add its MX, SPF (TXT, including the SMTP host the app sends through), DKIM and DMARC. Send a test order to a Gmail inbox and confirm it doesn't land in spam.
4. `lppeptide.com`: **write down every MX/SPF/DKIM/DMARC record before touching anything** and keep them. Add a 301 redirect rule `https://lppeptide.com/*` and `www` → `https://lppeptide.co/$1` (path and query kept), so old links, bookmarks and search results land on the same page.
5. After launch: add `lppeptide.co` to Google Search Console and use "Change of address" from the old property.

## Backups
- Nightly cron: `sqlite3 data/lppeptide.db ".backup 'backups/lp-$(date +%F).db'"` plus tar of `uploads/`. Keep 14 days and copy offsite (rclone to any bucket the client owns).
- Test a restore once before handover.
- v2: `npm run backup` also archives `PRIVATE_DIR` (payment proofs, customer documents): keep the offsite copy private.

## Launch checklist
Status 2026-11-21: `[x]` verified, `[~]` verified on the local production build, still to repeat on the server, `[!]` blocked (docs/09 B2/B3).
- [~] All URLs in `docs/05` return 200 (smoke script): 119/119 locally. On the server: `npm run smoke -- https://lppeptide.co`
- [~] Test order end-to-end: emails received, visible in admin, status → SHIPPED email. Done locally with emails written to `data/mail/`; on production it needs SMTP (B2)
- [!] Admin password changed, `ADMIN_PASSWORD` removed from env (at first deploy, B3)
- [!] Lighthouse mobile ≥ 90 performance and SEO on home and product pages (run in Chrome DevTools against the deployed site)
- [~] Backups running, restore tested: `scripts/backup.sh` snapshot and restore tested locally; the nightly cron is installed on the VPS (B3)
- [!] MX unchanged, webmail still works (DNS cutover, B3)
