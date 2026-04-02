# Architecture

## Default choices

- Frontend: Next.js on Vercel in `frontend/`
- Backend: FastAPI on Render in `backend/`
- Database: Supabase schema in `database/supabase_schema.sql`
- Trend sources: Hacker News, Reddit, News API, and RSS feeds
- Generation: OpenAI, with no hardcoded generation fallback

## Major decisions and options

### Database

- Default: Supabase
  - Pros: simple SQL schema, JSON columns for lint and similarity metadata, clean fit for Render + Vercel
  - Why chosen: fastest way to support trend deduplication, stored batches, and performance feedback
- Alternative: Firebase
  - Pros: simple client onboarding and generous free tier
  - Tradeoff: document-style modeling is a bit clunkier for the analytics-style joins used by the feedback loop

### News provider

- Default: News API via `NEWS_API_KEY`
  - Pros: quick setup and straightforward article response shape
  - Why chosen: easy to slot into a dedupe-and-rank pipeline
- Alternative: any provider that returns article title, url, source, and published date
  - Tradeoff: a new connector needs a tiny adapter layer

### Model provider

- Default: configurable provider, not a hardcoded model
  - Why chosen: avoids baking unstable model names into the repo
- Default and only provider: OpenAI with `OPENAI_API_KEY` + `OPENAI_MODEL`
- No hardcoded generator fallback: misconfiguration should fail clearly

## Request flow

1. Frontend calls `POST /api/generate-batch` with the selected voice preset.
2. Backend fetches live trends from multiple connectors.
3. Trends are scored, deduplicated, and filtered against recent history.
4. A trend brief is created from the freshest relevant items.
5. Style guide context and performance feedback summary are loaded.
6. The generator creates 5 posts against the trend brief.
7. Each post is linted and checked for similarity against the research corpus and prior generated posts.
8. Batch and post metadata are stored.
9. Frontend renders the 5 posts, tagging hints, lint results, source grounding, and feedback controls.

## Requirement mapping

- Learn from top-performing creators: `database/influencer_corpus.json`, `prompts/style_guide.md`, `GET /api/style-guide`
- Track live trends: `backend/app/services/trends.py` and connector modules
- Generate 5 fresh posts per click: `POST /api/generate-batch`
- Linting: `backend/app/services/linting.py`
- Similarity checks: `backend/app/services/similarity.py`
- Brand voice presets: `prompts/founder_voice.md`, `prompts/company_voice.md`, frontend voice toggle
- Performance loop: `POST /api/feedback`, `backend/app/services/feedback.py`, `backend/app/services/storage.py`
