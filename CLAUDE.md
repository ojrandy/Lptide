# CLAUDE.md — LPPEPTIDE rebuild

@AGENTS.md

Rebuild of https://lppeptide.com (research-peptide store) after the client lost its source code.
**v1 deadline: Sun 22 Nov 2026.** Scope, stack and decisions are fixed in `/docs`. Read the relevant doc before coding.

| Need | Read |
|---|---|
| Scope v1/v2, content fixes, open questions | docs/01-project-brief.md |
| Architecture, folders, data flow, decisions | docs/02-architecture.md |
| Stack, packages, scripts | docs/03-tech-stack.md |
| Schema, order states, server rules, seed | docs/04-data-model.md |
| URLs (must match the live site), SEO | docs/05-routes-and-seo.md |
| Look-alike tokens and components | docs/06-design-system.md + `_capture/screens/` |
| Admin screens, auth, emails | docs/07-admin-dashboard.md |
| Security baseline, env, deploy, DNS | docs/08-security-and-deployment.md |
| What's done / next / blocked | docs/09-project-tracker.md |
| Session prompts (v1, v2) | prompt.md |

## Stack (don't add to it without a reason written in docs/09 decisions log)
Next.js 16 App Router + React 19 + TypeScript strict · Tailwind 4 · shadcn/ui (admin only) · SQLite (built-in `node:sqlite`) + Drizzle (`sqlite-proxy`) · Zod · Server Actions · jose + bcryptjs · Zustand (cart) · Nodemailer (client SMTP).

Dev machine: Windows Application Control blocks compiled native addons (so no better-sqlite3), and npm 11 blocks install scripts until they're approved. Prefer pure-JS packages.

## Commands
```bash
npm run dev          # http://localhost:3000
npm run typecheck && npm run lint && npm run build   # must pass before marking a task done
npm run db:generate && npm run db:migrate
npm run db:seed      # imports _capture/ (idempotent)
```

## Rules
- **The storefront must look like the live site.** Use the tokens in docs/06 and compare against `_capture/screens/`. If a value is missing, sample it from the live page. Don't invent styles.
- **Never change a product slug or public URL.** Product URL = `/peptide/{slug}.html`; pages use trailing slashes.
- **Content comes from `_capture/`.** Never invent product facts, prices or medical claims. Copy edits are limited to the fixes in docs/01.
- Server components by default. Use `'use client'` only for interactivity.
- Mutations are Server Actions in `src/lib/actions/*`. Each one Zod-parses its input. Each admin action calls `requireAdmin()` first.
- Prices are re-computed on the server from `product_prices`. Money is stored in integer cents. Order items snapshot name, SKU and price.
- Next 16: middleware is `src/proxy.ts`. `params`/`searchParams` are async (await them). Check `node_modules/next/dist/docs` when unsure about an API.
- No new third-party services or APIs in v1. No secrets in code. `.env.example` lists every variable.
- Keep it simple: no abstractions for a single use, no speculative features. v2 items live in docs/09 backlog.
- `_capture/` is read-only reference data.
- At the end of a session, update docs/09-project-tracker.md.

## Live-site crawling (if more reference is needed)
The live site rate-limits (503) and is behind Cloudflare. Use the browser, about 1 request per second. Its public JSON API is at `/api/products`, `/api/products/slug/{slug}` and `/api/admin/public/*`.
