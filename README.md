# Lindin Gen

LinkedIn post generation workflow for a B2B SaaS startup focused on investment banking and fintech automation.

## What this now satisfies

- Fresh generation on every click through a single frontend Generate button
- Exactly 5 posts per batch
- No auth or login requirements
- Live trend intake from Reddit, Hacker News, News API, and RSS feeds
- Research-backed style guidance influenced by high-performing B2B creator patterns
- Brand voice presets for founder voice and company voice
- Post linting for weak hooks, fluff, vague claims, missing credibility, and readability issues
- Similarity checking against a seeded influencer-pattern corpus and previously generated posts
- Performance feedback loop that records post metrics and feeds them into the next batch
- Supabase production schema for persistence and feedback

## Project structure

```text
frontend/   Next.js app for Vercel
backend/    FastAPI app for Render
database/   Supabase schema and research corpus
prompts/    Prompt templates and voice guides
docs/       Architecture notes and research sources
```

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
- `GET /api/style-guide`
- `GET /api/trends/brief`
- `POST /api/generate-batch`
- `POST /api/feedback`
- `DELETE /api/trends/cleanup`

## Important notes

- Supabase is required for real persistence and the feedback loop. Local fallback is disabled by default and can only be enabled explicitly with `ALLOW_LOCAL_DEV_FALLBACK=true`.
- The seeded research corpus stores pattern summaries, not copied LinkedIn posts.
- The generator requires a real OpenAI configuration: `OPENAI_API_KEY` plus `OPENAI_MODEL`.
- `GET /api/system/status` reports whether AI and database configuration are actually ready.
- The deployable application lives entirely in `frontend/`, `backend/`, `database/`, `prompts/`, and `docs/`.
