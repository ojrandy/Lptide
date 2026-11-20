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
SITE_URL=https://lppeptide.com
AUTH_SECRET=                # openssl rand -base64 48
ADMIN_EMAIL=                # first admin (seed only)
ADMIN_PASSWORD=             # first admin (seed only)
SMTP_HOST=
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=lppeptideofficial@lppeptide.com
SMTP_PASS=
MAIL_FROM="LPPEPTIDE <lppeptideofficial@lppeptide.com>"
STORE_INBOX=lppeptideofficial@lppeptide.com
```

## Hosting
- **VPS:** 1 vCPU / 2 GB, Ubuntu 24.04 (Hetzner CX22 or a DigitalOcean basic droplet).
- Node 24 LTS, PM2 (`pm2 start npm --name lppeptide -- start`, `pm2 save`, `pm2 startup`), Caddy reverse proxy to :3000 with automatic HTTPS.
- Data paths outside the release dir: `/srv/lppeptide/data`, `/srv/lppeptide/uploads`.

## Deploy steps
1. `git pull && npm ci && npm run build && npm run db:migrate && pm2 reload lppeptide`
2. First deploy only: `npm run db:seed`, then sign in and change the admin password.

## DNS cutover (do not break email)
1. The live site sits behind Cloudflare. Get access to the Cloudflare/DNS account.
2. **Write down every MX, SPF (TXT), DKIM and DMARC record before touching anything.**
3. Change **only** the `A`/`AAAA` (or `CNAME`) for `lppeptide.com` and `www` to the VPS.
4. Keep the Cloudflare proxy on. SSL mode **Full (strict)**.
5. Make sure SPF includes the SMTP host the app sends through. Send a test order to a Gmail inbox and confirm it doesn't land in spam.

## Backups
- Nightly cron: `sqlite3 data/lppeptide.db ".backup 'backups/lp-$(date +%F).db'"` plus tar of `uploads/`. Keep 14 days and copy offsite (rclone to any bucket the client owns).
- Test a restore once before handover.

## Launch checklist
- [ ] All URLs in `docs/05` return 200 (smoke script)
- [ ] Test order end-to-end: emails received, visible in admin, status → SHIPPED email
- [ ] Admin password changed, `ADMIN_PASSWORD` removed from env
- [ ] Lighthouse mobile ≥ 90 performance and SEO on home and product pages
- [ ] Backups running, restore tested
- [ ] MX unchanged, webmail still works
