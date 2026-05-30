# Netpost — LinkedIn Post Generator

Live at [netpost.rianfernando.com](https://netpost.rianfernando.com).

A no-login LinkedIn post generation workflow for a B2B SaaS startup focused on investment banking and fintech automation. Each click pulls live trends, layers in researched style patterns, and returns five high-signal posts.

## What this satisfies

- Fresh generation on every click through a single Generate button
- Exactly 5 posts per batch
- No auth or login requirements
- Live trend intake from Reddit, Hacker News, News API, and RSS feeds
- Research-backed style guidance influenced by high-performing B2B creator patterns
- Brand voice presets for founder voice and company voice
- Post linting for weak hooks, fluff, vague claims, missing credibility, and readability issues
- Similarity checking against a seeded influencer-pattern corpus and previously generated posts
- Performance feedback loop that records post metrics and feeds them into the next batch
- Supabase production schema for persistence and feedback
- Netpost brand identity — logo, favicon (high-contrast for browser tabs), apple-touch icon, theme tokens
- SEO + social-share metadata — sitemap, robots, generated Open Graph image, Twitter card, JSON-LD `SoftwareApplication`, canonical URL

## Project structure

```text
frontend/   Next.js app for Vercel
backend/    FastAPI app for Render
database/   Supabase schema and research corpus
prompts/    Prompt templates and voice guides
docs/       Architecture notes and research sources
```

## Deployment

| Layer | Host | URL |
|---|---|---|
| Frontend | Vercel | `https://netpost.rianfernando.com` (CNAME via Cloudflare → `cname.vercel-dns.com`) |
| Backend | Render | `*.onrender.com` |
| Database | Supabase | private REST (server-to-server only) |

The frontend's canonical URL is pinned to the subdomain via Next.js `metadataBase`, so any incidental `*.vercel.app` URL renders the same `<link rel="canonical">` and search engines de-duplicate to the primary domain. The Vercel project's `FRONTEND_URL` env on Render is set to the subdomain so CORS allows the production origin.

## Quick start

### Backend

```bash
cd backend
cp .env.example .env
python3 -m pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

## Core endpoints

- `GET /health`
- `GET /api/system/status`
- `GET /api/style-guide`
- `GET /api/trends/brief`
- `POST /api/generate-batch`
- `POST /api/feedback`
- `DELETE /api/trends/cleanup`

## SEO and discoverability

Implemented entirely with Next.js 15 App Router conventions — no extra dependencies.

| File | What it produces |
|---|---|
| `frontend/app/sitemap.ts` | `/sitemap.xml` with the canonical home URL |
| `frontend/app/robots.ts` | `/robots.txt` allowing all crawlers, pointing at the sitemap |
| `frontend/app/opengraph-image.tsx` | 1200×630 PNG generated via `next/og`, served at `/opengraph-image` |
| `frontend/app/layout.tsx` | `metadata` export covering title, description, canonical, Open Graph, Twitter card, `robots`, author; inline JSON-LD `SoftwareApplication` linking back to `rianfernando.com`; footer backlink `Built by Rian Fernando` |
| `frontend/app/icon.svg`, `apple-icon.svg` | Browser-tab and iOS home-screen icons (Next auto-injects the `<link>` tags) |

## Important notes

- Supabase is required for real persistence and the feedback loop. Local fallback is disabled by default and can only be enabled explicitly with `ALLOW_LOCAL_DEV_FALLBACK=true`.
- The seeded research corpus stores pattern summaries, not copied LinkedIn posts.
- The generator requires a real OpenAI configuration: `OPENAI_API_KEY` plus `OPENAI_MODEL`.
- `GET /api/system/status` reports whether AI and database configuration are actually ready.
- The deployable application lives entirely in `frontend/`, `backend/`, `database/`, `prompts/`, and `docs/`.

---

Built by [Rian Fernando](https://rianfernando.com).
