# Architecture

## System overview

A no-login LinkedIn post generation workflow for a B2B SaaS startup focused on Investment Banking and Fintech Automation. Each click fetches live trends, assembles a prompt with style and voice context, generates exactly 5 posts via OpenAI, and persists everything to Supabase.

## Stack

| Layer | Technology | Deployment |
|---|---|---|
| Frontend | Next.js 15 App Router, React 18, TypeScript | Vercel |
| Backend | FastAPI, Python 3.13 | Render |
| Database | PostgreSQL via Supabase REST API | Supabase |
| LLM | OpenAI (gpt-5.4) structured JSON output | — |

## Directory structure

```
/frontend        → Next.js app (Vercel)
/backend         → FastAPI app (Render)
/database        → Supabase SQL schema + influencer corpus
/prompts         → Prompt templates (style guide, voice presets, generation prompt)
/docs            → Architecture and research docs
```

## Request flow

1. Frontend sends `POST /api/generate-batch` with `{voice, count: 5}`.
2. Backend checks system readiness — AI configured and Supabase reachable.
3. Four connectors fetch trends in parallel (Hacker News, Reddit, RSS, optional News API).
4. Trends are deduplicated by SHA1 fingerprint, scored by keyword relevance × source weight + freshness bonus, and ranked.
5. Top 5–10 items form the trend brief. Recently used trend IDs are rotated out when enough fresh alternatives exist.
6. Style guide + voice preset + feedback summary + trend brief are assembled into a layered prompt.
7. OpenAI generates 5 posts as structured JSON. Up to 3 retries if validation fails.
8. Each post is linted, similarity-checked against the corpus and historical posts, and tagged.
9. Batch, posts, and trends are persisted to Supabase.
10. Response returns to the frontend with posts, lint results, similarity scores, source grounding, and tagging hints.

## API endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Health check with AI and DB status |
| GET | `/api/system/status` | Detailed readiness report |
| GET | `/api/style-guide` | Style bundle with pattern summaries |
| GET | `/api/trends/brief` | Live trend brief (5–10 items) |
| POST | `/api/generate-batch` | Generate 5 posts from live trends |
| POST | `/api/feedback` | Record post performance metrics |
| DELETE | `/api/trends/cleanup` | Remove trends older than TTL |

## Database schema (Supabase)

Four tables with Row Level Security (service-role only):

- **trend_events** — Every fetched trend item. Deduplicated by `fingerprint` (SHA1 of normalized title). `id` is source-specific (e.g., `hn-12345`, `reddit-abc`). Tags and metadata stored as JSONB.
- **generation_batches** — Groups of 5 posts. UUID primary key. Stores voice preset and feedback context snapshot.
- **generated_posts** — Individual posts with lint/similarity results as JSONB. Cascade-deletes with batch. `source_ids` links back to trend_events.
- **post_feedback** — Performance metrics (impressions, reactions, comments, reposts, saves, clicks). 1:1 with generated_posts via `post_id` primary key.

## Trend sources

| Source | Count | Auth required | Coverage |
|---|---|---|---|
| Hacker News | Top 20 stories | No | Tech/AI trends, startup launches |
| Reddit | 4 posts × 5 subreddits | No (public JSON) | Practitioner discussion, pain points |
| RSS feeds | 6 entries × 10 feeds | No | Industry journalism (Finextra, American Banker, PYMNTS, Banking Dive, etc.) |
| News API | Up to 20 articles | Yes (NEWS_API_KEY) | Broader press coverage |

Scoring: `keyword_relevance × source_weight + freshness_bonus`. Freshness gives up to 2.0 bonus for items < 24 hours old. Source weights: News API (1.4) > company blogs (1.3) > RSS (1.2) > Hacker News (1.1) > Reddit (0.95).

## Prompt engineering

Four-layer prompt assembly:

1. **System prompt** — Role as B2B LinkedIn strategist
2. **Style guide** — Structural patterns extracted from 6 high-performing creators (hooks, rhythm, credibility moves, CTAs)
3. **Voice preset** — Founder (opinionated, operator-led) or Company (measured, educational)
4. **User prompt** — Trend brief + feedback summary + anti-duplication context (batch nonce, fresh angle target, recent hooks to avoid)

Anti-duplication: batch nonce (UUID), random fresh angle from 8 banking-specific options, recent hook avoidance list, 3-retry validation loop.

## Quality pipeline

- **Linting** — Regex checks for weak hooks, vague claims, fluff, missing credibility (requires metric OR named authority), readability, hashtag spam, filler CTAs, corporate closings. Score starts at 100 with deductions.
- **Similarity** — Weighted score: 35% token overlap (Jaccard) + 40% shingle overlap (3-grams) + 25% cosine similarity. Thresholds: <25 clear, 25–45 review, ≥45 blocked.
- **Tagging** — Scans post body for 80+ known entities (banks, fintechs, regulators, consulting firms, industry figures). Limited to 2 hints per post.

## Feedback loop

Users enter LinkedIn performance metrics per post. Weighted scoring: `impressions/1000 + reactions×1 + comments×3 + reposts×5 + saves×4 + clicks×2`. Summary aggregates by hook type, format, voice, and topic. Injected into next generation prompt to bias toward patterns that drove engagement.

## Style learning

Research corpus (`database/influencer_corpus.json`) stores pattern summaries from 6 sources — Justin Welsh, Ross Simmonds, Dave Gerhardt, Lara Acosta, LinkedIn Marketing Solutions, Shield Analytics. Patterns include hook types, structure patterns, and credibility moves. No copied posts.

## Design decisions

| Decision | Why |
|---|---|
| Supabase REST via httpx, not Python SDK | Newer `sb_secret_` keys have SDK compatibility issues. Raw REST is simpler and guaranteed to work. |
| JSONB for lint, similarity, tags, hashtags | Nested/variable structures read whole, never filtered individually. JSONB avoids unnecessary normalization. |
| `post_feedback` as separate table | Feedback arrives asynchronously, not all posts get it. Keeps posts table clean. |
| `fingerprint` unique constraint | Prevents storing the same story from multiple sources. SHA1 of normalized title. |
| RLS with service-role policies | Backend-only access. Browser can never query directly, even with Supabase URL. |
| No local fallback by default | Production must fail clearly if DB is missing, not silently write to ephemeral local files. |
| No mock generation | If OpenAI isn't configured, return 503, not fake output. |
| OpenAI only | Single provider avoids abstraction complexity. Model configurable via env var. |
