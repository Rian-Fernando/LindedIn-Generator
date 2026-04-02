# Complete Interview Guide — LinkedIn Post Generator

## 1. Project Overview

### Q: What is this project?
A LinkedIn Post Generator built for a B2B SaaS startup focused on Investment Banking and Fintech Automation. It's a no-login, single-page application where one click fetches live industry trends from multiple sources, assembles a layered prompt with style and voice context, and generates exactly 5 LinkedIn posts via OpenAI. Every post goes through a quality pipeline (linting, similarity checking, tagging) before being persisted to Supabase.

### Q: What problem does it solve?
LinkedIn content for B2B fintech is hard to get right. Most AI-generated posts feel like generic slop — they lack specificity, credibility, and the authentic voice that actually performs on the platform. This tool solves that by:
1. Grounding every post in real, live industry trends (not hallucinated content)
2. Learning from high-performing B2B creator patterns (hooks, structure, credibility moves)
3. Running a quality pipeline that flags weak content before it gets posted
4. Closing the feedback loop — actual LinkedIn performance metrics feed back into future generation

### Q: Why no login/auth?
This is a focused internal tool for a single startup's content team. Adding auth would add complexity without value. The Supabase database uses Row Level Security with service-role-only policies, so the browser can never query the database directly even with the Supabase URL.

### Q: Why exactly 5 posts?
It's a product decision. Five gives enough variety for the content team to pick the best 1-2 to post without overwhelming them with choices. The `BatchRequest` model enforces this with `count: int = Field(default=5, ge=5, le=5)` — Pydantic validation rejects any other value at the API boundary.

---

## 2. Architecture & System Design

### Q: Walk me through the full request flow.
1. Frontend sends `POST /api/generate-batch` with `{voice: "founder"|"company", count: 5}`
2. Backend checks system readiness — is OpenAI configured? Is Supabase reachable?
3. Four connectors fetch trends in parallel via `asyncio.gather`: Hacker News, Reddit, RSS (10 feeds), and News API
4. Trends are deduplicated by SHA1 fingerprint of the normalized title, scored by `keyword_relevance × source_weight + freshness_bonus`, and ranked
5. Top 5-10 items form the trend brief. Recently used trend IDs are rotated out when enough fresh alternatives exist
6. Style guide + voice preset + feedback summary + trend brief are assembled into a four-layer prompt
7. OpenAI generates 5 posts as structured JSON (`response_format: json_object`). Up to 3 retries if validation fails
8. Each post is linted (regex quality checks), similarity-checked (token + shingle + cosine against corpus and history), and tagged (entity scanning against 78 known entities)
9. Batch, posts, and trends are persisted to Supabase via REST API
10. Response returns to the frontend with posts, lint results, similarity scores, source grounding, and tagging hints

### Q: Why this specific tech stack?
- **FastAPI (Python)**: Async-native, great for parallel HTTP calls to trend sources. Pydantic integration gives us schema validation for free. Python ecosystem has `feedparser` for RSS, `openai` SDK, etc.
- **Next.js 15 App Router**: React with server-side capabilities, TypeScript for type safety, deploys trivially to Vercel
- **Supabase**: Managed PostgreSQL with REST API, RLS built-in. We use the REST API directly via httpx instead of the Python SDK because newer `sb_secret_` keys have SDK compatibility issues — raw REST is simpler and guaranteed to work
- **OpenAI (gpt-5.4)**: Single provider avoids abstraction complexity. Structured JSON output mode gives predictable parsing

### Q: Why not use the Supabase Python SDK?
Supabase's newer `sb_secret_` service-role keys have compatibility issues with the Python SDK's JWT parsing. Using raw REST via httpx is more reliable — we just set the `apikey` header and hit `/rest/v1/{table}`. It's also fewer dependencies and gives us full control over error handling.

### Q: How do the frontend and backend communicate?
The frontend makes direct HTTP calls to the backend API. Three functions in `lib/api.ts`:
- `generateBatch(voice)` → POST to `/api/generate-batch` with `{voice, count: 5}`
- `fetchStyleGuide()` → GET to `/api/style-guide`
- `submitFeedback(payload)` → POST to `/api/feedback`

The backend URL comes from `NEXT_PUBLIC_BACKEND_URL` env var. CORS is configured to allow the frontend's origin.

### Q: What happens if OpenAI is down or the API key is invalid?
The `/api/generate-batch` endpoint calls `system_status()` first. If `ai.configured` is false, it returns HTTP 503 with a specific error message. The frontend catches this and displays it in an error panel. There are no silent fallbacks or mock generation — the system fails clearly.

### Q: What happens if Supabase is unreachable?
Same pattern. The storage service probes Supabase by querying each table with a schema-aware column (`SELECT id FROM trend_events LIMIT 1`, etc. — and notably `SELECT post_id FROM post_feedback` since that table's PK is `post_id`, not `id`). If any probe fails, `supabase_ready` is false and generation returns 503.

---

## 3. Backend Deep Dive

### Q: Explain the backend file structure.
```
backend/
├── app/
│   ├── core/
│   │   └── config.py          # Settings via pydantic-settings, env loading
│   ├── models/
│   │   └── schemas.py          # All Pydantic models (TrendItem, GeneratedPost, etc.)
│   ├── services/
│   │   ├── connectors/
│   │   │   ├── hacker_news.py  # HN top stories connector
│   │   │   ├── reddit.py       # Reddit public JSON connector
│   │   │   ├── rss.py          # RSS/Atom feed connector via feedparser
│   │   │   └── news_api.py     # News API connector (optional)
│   │   ├── feedback.py         # Performance scoring & summary
│   │   ├── generator.py        # OpenAI generation + validation + retry
│   │   ├── linting.py          # Regex-based quality checks
│   │   ├── similarity.py       # Token/shingle/cosine similarity checker
│   │   ├── storage.py          # Supabase REST + local fallback storage
│   │   ├── style_guide.py      # Style corpus loading & pattern aggregation
│   │   ├── tagging.py          # Entity recognition against 78 known entities
│   │   └── trends.py           # Trend orchestration, scoring, deduplication
│   └── main.py                 # FastAPI app, routes, middleware
├── tests/
│   ├── test_linting.py
│   ├── test_similarity.py
│   ├── test_generator.py
│   └── test_storage.py
└── requirements.txt
```

### Q: Walk me through config.py.
Uses `pydantic-settings` `BaseSettings` with `SettingsConfigDict` to load from `.env`. All env vars map to typed fields. Key details:
- `ROOT_DIR` resolves to the project root (3 parents up from config.py)
- `DEFAULT_RSS_FEEDS` is a list of 10 feed dicts (Finextra, PYMNTS, TechCrunch Fintech, American Banker, FT Banking, The Banker, Finovate, Tearsheet, Banking Dive, Payments Dive)
- `rss_feeds_json` defaults to the serialized default feeds; overridable via env
- `rss_feeds` property parses the JSON and filters out entries without URLs
- `reddit_subreddit_list` property splits the comma-separated string
- `@lru_cache(maxsize=1)` on `get_settings()` ensures singleton

### Q: Explain the Pydantic models in schemas.py.
Key models:
- **VoicePreset**: Enum with `FOUNDER` and `COMPANY`
- **TrendItem**: `id`, `title`, `source`, `source_type`, `url`, `summary`, `relevance_reason`, `published_at`, `tags`, `score`, `fingerprint`
- **TrendBrief**: Collection of TrendItems with metadata (`total_fetched`, `fresh_count`, `unique_count`, `source_breakdown`)
- **TaggingHint**: `entity`, `entity_type` (Literal "company"|"person"), `reason`
- **LintResult**: `score` (int), `flags` (list of strings)
- **SimilarityMatch**: `source_id`, `label`, `score`, `source_type`
- **SimilarityResult**: `max_score`, `status` (Literal "clear"|"review"|"blocked"), top 3 `matches`
- **GeneratedPost**: Full post with all fields. `sources` is transient (not persisted to DB)
- **BatchRequest**: `voice` + `count` with `Field(default=5, ge=5, le=5)` — enforces exactly 5
- **BatchResponse**: `batch_id`, `voice`, `generated_at`, `trend_brief`, `posts`, `feedback_summary`, `style_summary`
- **FeedbackRequest/Response**: Metrics input + confirmation

### Q: How does the generator work?
`GeneratorService` in `generator.py`:

1. **Prompt assembly** (`_render_user_prompt`): Joins the generation prompt template (with `{count}` placeholder), voice preset, feedback summary, batch nonce, angle note, recent history avoidance note, style context, and trend brief JSON

2. **OpenAI call** (`_generate_with_openai`): Creates an OpenAI client, sends a chat completion with:
   - System message: "You are a top-tier B2B LinkedIn strategist and copywriter"
   - User message: the assembled prompt
   - `response_format: {"type": "json_object"}` for structured output

3. **Parsing** (`_parse_generated_posts`): Handles messy LLM output gracefully:
   - `_coerce_tagging_hints`: Filters out malformed hints (must have entity, entity_type in {"company","person"}, and reason)
   - `_coerce_string_list`: Handles both arrays and comma-separated strings
   - `_coerce_post_format`: Validates short/mid/long, defaults to "mid"
   - Falls back to first trend if trend_id doesn't match

4. **Validation** (`_validate_posts`): Checks:
   - Exactly 5 posts returned
   - No duplicate trend usage within batch
   - No duplicate content within batch (normalized hook+body comparison)
   - No match against historical post signatures

5. **Retry loop** (`generate`): Up to 3 attempts. Each retry gets a fresh batch nonce, fresh angle targets (sampled from 8 options like "execution bottleneck", "deal-team leverage", "compliance implication"), and a retry note explaining why the previous attempt failed

### Q: What are the 8 fresh angle options?
```python
FRESH_ANGLE_OPTIONS = [
    "execution bottleneck",
    "workflow risk",
    "deal-team leverage",
    "compliance implication",
    "customer buying signal",
    "operating tradeoff",
    "implementation lesson",
    "market structure implication",
]
```
Three are randomly sampled per batch to encourage diverse framing.

### Q: How does the trend pipeline work?
`TrendService` in `trends.py`:

1. **Parallel fetching**: All 4 connectors run simultaneously via `asyncio.gather(return_exceptions=True)`. If one fails, others still succeed.

2. **Connectors**:
   - **Hacker News**: Fetches top 20 story IDs, then each story's details. ID format: `hn-{storyId}`. Fingerprint: SHA1 of `hn:{title.lower()}`
   - **Reddit**: 4 posts × first 5 subreddits via public JSON (`/r/{sub}/hot.json?limit=8`). ID format: `reddit-{id}`. No auth needed — uses User-Agent header only
   - **RSS**: 6 entries × 10 feeds via `feedparser`. ID format: SHA1 of link URL (first 16 chars). Strips HTML tags from summaries
   - **News API**: Up to 20 articles if `NEWS_API_KEY` is set. Query: `fintech OR banking AI OR payments automation OR investment banking OR compliance automation`. Returns empty list if key missing

3. **Deduplication** (`_deduplicate`): Groups by SHA1 fingerprint. If same story appears from multiple sources, keeps the higher-scored version.

4. **Scoring** (`_score_item`): `keyword_relevance × source_weight + freshness_bonus`
   - Keyword relevance: sum of weights for matching keywords in title+summary
   - Source weights: News API (1.4) > company blogs (1.3) > RSS (1.2) > HN (1.1) > Reddit (0.95)
   - Freshness bonus: `max(0, 24 - min(age_hours, 24)) / 12` — up to 2.0 for brand-new items

5. **Relevance filter**: Items with zero keyword relevance (no matching industry keywords in title or summary) are discarded entirely, regardless of freshness or source weight. This prevents noise like random PyPI packages or promotional content from polluting the brief.

6. **Storage**: Fresh trends (not already in Supabase within TTL window) are stored. The trend brief selects fresh items first, falls back to ranked items.

### Q: How does Supabase REST work without the SDK?
`StorageService` in `storage.py` uses `httpx.request()` directly:

```python
headers = {"apikey": settings.supabase_key, "Content-Type": "application/json"}
url = f"{settings.supabase_url}/rest/v1/{table}"
```

Key operations:
- **Upsert trends**: POST to `trend_events` with `Prefer: return=representation`
- **Save batch**: POST to `generation_batches`, get back UUID, then POST posts to `generated_posts`
- **Record feedback**: POST to `post_feedback` with `on_conflict=post_id` and `Prefer: resolution=merge-duplicates`
- **List recent posts**: GET from `generated_posts` with `order=created_at.desc&limit=25`
- **Probe readiness**: GET each table with `select={column}&limit=1`

The service detects key type — rejects `sb_publishable_` keys since the backend needs write access.

### Q: How does `_serialize_post_record` work?
It converts a `GeneratedPost` to a dict matching the exact database columns:
```python
{
    "id", "batch_id", "trend_id", "trend_title", "voice",
    "hook", "hook_type", "body", "format", "hashtags",
    "tagging_hints", "source_ids", "lint", "similarity"
}
```
Crucially, it excludes `sources` (transient field not in the DB schema) and converts the `voice` enum to its string value. This is tested explicitly — `assert "sources" not in record`.

---

## 4. Quality Pipeline

### Q: How does linting work?
`linting.py` uses compiled regex patterns to check for 9 quality issues:

| Check | Regex/Logic | Penalty |
|---|---|---|
| Weak hook | Starts with "I", "In my experience", "As a" | -18 |
| Vague claims | "amazing", "incredible", "game-changing", etc. | -14 |
| Generic/fluffy | "a lot of", "everyone knows", etc. | -12 |
| Missing credibility | No metric AND no named authority in hook+body | -10 |
| Poor readability | < 3 paragraphs or any paragraph > 65 words | -14 |
| Hashtag spam | > 5 hashtags | -12 |
| Filler CTA | "feel free to", "hope this helps", etc. | -10 |
| Corporate close | "in conclusion", "to summarize" | -10 |
| Too many tags | > 2 tagging hints | -8 |

Score starts at 100 with deductions. `max(score, 0)` ensures it never goes negative.

The **credibility check** is the most nuanced. It passes if the post contains EITHER:
- A metric: `$` amounts, percentages, time periods, years (`METRIC_RE`)
- OR a named authority: SEC, OCC, CFPB, Basel, FDIC, FINRA, Federal Reserve, McKinsey, Deloitte, Accenture, PwC, EY, KPMG, Gartner, Forrester, CB Insights, Reuters, Bloomberg, S&P, Moody's (`CREDIBILITY_RE`)

The credibility check scans both the hook and body combined (`full_text = f"{hook}\n{body}"`), so a year like "2026" in the hook counts. This avoids false positives on strategy/framework posts that don't use hard numbers but reference authoritative sources.

### Q: How does similarity checking work?
`SimilarityChecker` in `similarity.py` compares each generated post against the influencer corpus AND recent historical posts.

Three metrics combined with weights:
1. **Token overlap (35%)**: Jaccard similarity of unique lowercase tokens
2. **Shingle overlap (40%)**: Jaccard similarity of 3-gram shingles (sliding windows of 3 tokens)
3. **Cosine similarity (25%)**: Standard cosine of token frequency vectors

Final score = `(token_overlap × 0.35 + shingle_overlap × 0.4 + cosine × 0.25) × 100`

Thresholds:
- **< 25**: `clear` — post is original enough
- **25-45**: `review` — might need a human look
- **>= 45**: `blocked` — too similar, should not be used

Historical posts are labeled by their hook text (first 80 chars) rather than raw IDs, so similarity matches show readable labels like "Most diligence bottlenecks are still handoff problems" instead of "historical-post-4a89252452".

### Q: Why shingles AND cosine AND token overlap? Why not just one?
Each captures different aspects:
- **Token overlap** catches vocabulary similarity but misses word order
- **Shingles** (3-grams) catch phrase-level copying that token overlap misses
- **Cosine similarity** weights by frequency — catches posts that use the same words repeatedly, even if the vocabulary set is similar

A post could share vocabulary (high token overlap) but use completely different phrases (low shingle overlap). The weighted combination is more robust than any single metric. The 40% weight on shingles is highest because phrase-level similarity is the strongest signal of actual copying.

### Q: How does tagging work?
`tagging.py` has a `KNOWN_ENTITIES` dictionary with 78 entries across 6 categories:
- **Major banks** (16): Goldman Sachs, JPMorgan, Morgan Stanley, Bank of America, Citigroup/Citi, Wells Fargo, Deutsche Bank, Barclays, UBS, Credit Suisse, HSBC, BNY Mellon, Lazard, Jefferies, Evercore
- **Fintech/payments** (23): Stripe, Plaid, Visa, Mastercard, Adyen, Klarna, Robinhood, Square, Block, PayPal, Brex, Ramp, Mercury, Marqeta, Affirm, Wise, Revolut, Chime, SoFi, Nubank, Rapyd, Toast, Checkout.com
- **Data/AI/infra** (12): Bloomberg, Nasdaq, Refinitiv, Palantir, Databricks, Snowflake, OpenAI, Perplexity, Google, Microsoft, AWS, Salesforce
- **Consulting/advisory** (9): McKinsey, Deloitte, Accenture, PwC, EY, KPMG, Gartner, Forrester, CB Insights
- **Regulators** (7): SEC, CFPB, OCC, FDIC, FINRA, Federal Reserve, Fed
- **People** (11): Jamie Dimon, David Solomon, Patrick Collison, John Collison, Jack Dorsey, Dan Schulman, Vlad Tenev, Max Levchin, Justin Welsh, Ross Simmonds, Jelena McWilliams

The `infer_tagging_hints` function scans the post body + source titles + source summaries for entity mentions using regex word boundaries (`\b` patterns, not substring matching — so "EY" won't false-match inside "they" or "survey"), and returns up to 2 hints. The generation prompt also instructs the LLM to naturally mention specific companies and figures, improving tag hit rate.

---

## 5. Feedback Loop

### Q: How does the feedback loop work end-to-end?
1. **Input**: User enters LinkedIn performance metrics per post (impressions, reactions, comments, reposts, saves, clicks, notes) via the collapsible feedback form in each post card
2. **Storage**: `POST /api/feedback` upserts to `post_feedback` table (uses `on_conflict=post_id` with merge-duplicates)
3. **Scoring**: `performance_score = impressions/1000 + reactions×1 + comments×3 + reposts×5 + saves×4 + clicks×2`
4. **Summarization**: `summarize_feedback` aggregates scores by hook type, format, voice, and topic. Finds the top performer in each category.
5. **Injection**: The summary string is included in the next generation prompt: "Best recent signal: founder voice, contrarian hooks, and mid format posts are leading..."
6. **Default**: If no feedback exists yet, the prompt gets: "No historical metrics recorded yet. Prioritize crisp hooks, concrete takeaways, and posts that connect live trends to real banking workflows."

### Q: Why weight reposts at 5× and saves at 4× but reactions only 1×?
LinkedIn's algorithm and real engagement value differ by action:
- **Reposts (5×)**: Highest value — expands reach to the reposter's entire network. Hardest to earn.
- **Saves (4×)**: Strong signal of genuine value — someone wants to come back to it.
- **Comments (3×)**: Drive algorithmic distribution and signal discussion-worthy content.
- **Clicks (2×)**: Show curiosity but are lower commitment than comments.
- **Reactions (1×)**: Easiest to give, lowest signal-to-noise ratio.
- **Impressions (÷1000)**: Normalizes the typically large number; impressions alone don't mean quality.

---

## 6. Prompt Engineering

### Q: Explain the four-layer prompt assembly.
1. **System prompt**: "You are a top-tier B2B LinkedIn strategist and copywriter." — Sets the LLM's role
2. **Style guide** (`style_guide.md`): Structural patterns extracted from 6 high-performing creators — hooks, rhythm, credibility moves, CTAs. Loaded from the file system.
3. **Voice preset** (`founder_voice.md` or `company_voice.md`): Founder is sharper, opinionated, operator-led. Company is measured, educational, category-authoritative.
4. **User prompt**: Assembled from multiple parts:
   - Generation prompt template (with `{count}` placeholder)
   - Voice preset label
   - Feedback loop summary
   - Batch nonce (UUID)
   - Fresh angle targets (3 random from 8 options)
   - Recent history avoidance list (last 5 hooks)
   - Style context (guide + voice + corpus notes)
   - Trend brief as JSON
   - Instruction to return only JSON with a `posts` array

### Q: How do you prevent the LLM from generating duplicate or stale content?
Five mechanisms:
1. **Batch nonce**: A unique UUID per generation call, ensuring the prompt is different each time
2. **Fresh angle targets**: 3 randomly sampled from 8 banking-specific angles ("execution bottleneck", "compliance implication", etc.)
3. **Recent hook avoidance**: Last 5 generated hooks are included with "Avoid repeating the framing, hook language, or body structure of these"
4. **Trend rotation**: Recently used trend IDs are filtered out when enough fresh alternatives exist
5. **Post-generation validation**: Checks for duplicate trends within batch, duplicate content within batch, and matches against historical post signatures. If validation fails, retries up to 3 times with the failure reason in the retry note.

### Q: What's in the generation prompt template?
Key instructions:
- Audience: investment banking leaders, deal teams, operations leaders, fintech buyers
- Generate exactly `{count}` posts using different trends
- Each post needs: `trend_id`, `hook`, `hook_type`, `body`, `format`, `hashtags`, `tagging_hints`, `source_ids`
- Hook types: contrarian, metric, painful-truth, story, question, framework
- Format: short, mid, long
- Body must contain a concrete takeaway with blank lines between paragraphs
- Naturally mention specific companies (JPMorgan, Stripe, Goldman Sachs, etc.) and include concrete metrics/stats
- Tagging hints should list entities actually mentioned in the body
- "If a fact is not in the trend brief, do not invent it"

---

## 7. Style Learning System

### Q: How does the style learning layer work?
`StyleGuideService` in `style_guide.py`:

1. **Corpus**: `database/influencer_corpus.json` contains pattern summaries from 6 sources — Justin Welsh, Ross Simmonds, Dave Gerhardt, Lara Acosta, LinkedIn Marketing Solutions, Shield Analytics. Each entry has: `id`, `creator`, `source_url`, `source_type`, `reference_summary`, `pattern_note`, `hook_types`, `structure`, `credibility_moves`.

2. **Aggregation**: `get_style_bundle()` counts occurrences of hook types, structure patterns, and credibility moves across all corpus entries using `Counter.most_common(5)`.

3. **Output**: Returns a `StyleGuideResponse` with:
   - `style_guide`: Full text from `prompts/style_guide.md`
   - `voice_guides`: Dict with founder and company voice texts
   - `research_corpus`: Raw corpus entries
   - `pattern_summary`: Top 5 hook types, structure patterns, credibility moves

4. **Generation context**: `build_generation_context(voice)` assembles the style guide text + selected voice guide + corpus notes into one string for the LLM prompt.

### Q: Why pattern summaries and not actual posts?
Three reasons:
1. **Legal**: Copying real LinkedIn posts would be plagiarism. We only store pattern analysis.
2. **Similarity checking**: If we had real posts in the corpus, the similarity checker would flag generated posts that sound anything like them.
3. **Better results**: The LLM generates better content when given structural patterns ("contrarian hook + operator proof point + concrete takeaway") than when given examples to mimic.

---

## 8. Database & SQL

### Q: Walk me through the schema.
Four tables with RLS:

**trend_events**: Every fetched trend item. `id` is source-specific (e.g., `hn-12345`, `reddit-abc`, SHA1 hash for RSS/News API). `fingerprint` (unique) is SHA1 of normalized title — prevents storing the same story from multiple sources.

**generation_batches**: Groups of 5 posts. UUID primary key via `gen_random_uuid()`. Stores `voice`, `trend_count`, and `feedback_summary` snapshot.

**generated_posts**: Individual posts. `batch_id` references `generation_batches` with cascade delete. JSONB columns for `hashtags`, `tagging_hints`, `source_ids`, `lint`, `similarity`. The `sources` field exists only in the API response, not the DB.

**post_feedback**: Performance metrics. PK is `post_id` (not `id`) — 1:1 with `generated_posts` via foreign key with cascade delete. `updated_at` tracks latest metric update.

### Q: Why JSONB for lint, similarity, tags, hashtags?
These are nested/variable structures that are always read whole, never individually filtered or joined. JSONB avoids unnecessary normalization — no need for a `lint_flags` join table when we always read all flags at once. PostgreSQL JSONB also supports indexing if we ever need it.

### Q: Why is post_feedback a separate table?
Feedback arrives asynchronously — not all posts get it. If it were on `generated_posts`, we'd have nullable columns for 7+ metrics cluttering the main table. Separate table keeps posts clean and makes the upsert pattern (`on_conflict=post_id`) cleaner.

### Q: Explain the RLS policies.
```sql
create policy "service role trend events"
  on trend_events for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
```
This means only requests authenticated with the service-role key can read or write. The Supabase anon/publishable key gets rejected. The backend checks key type and refuses publishable keys:
```python
if self.supabase_key_type == "publishable":
    return False, "Publishable Supabase key provided. This backend requires a server-side secret/service-role key."
```

### Q: Why does the probe use `post_id` for `post_feedback` instead of `id`?
Because `post_feedback`'s primary key IS `post_id`, not `id`. If we probed with `SELECT id FROM post_feedback LIMIT 1`, Supabase would return an error because the column doesn't exist. This was a real bug caught in testing — `test_supabase_probe_uses_schema_specific_columns` explicitly verifies this.

### Q: What indexes exist?
- `trend_events_fingerprint_idx`: Fast deduplication lookups
- `trend_events_created_at_idx`: Descending, for TTL cleanup queries
- `generated_posts_batch_idx`: Fast batch lookups
- `generated_posts_created_at_idx`: Descending, for recent post queries

---

## 9. Frontend Deep Dive

### Q: Explain the frontend architecture.
Single-page app with Next.js 15 App Router:
- `app/layout.tsx`: Root layout with metadata, themeColor `#0B132B`
- `app/page.tsx`: Main page component with state management
- `app/globals.css`: All styles (dark theme, glassmorphism, responsive)
- `components/PostCard.tsx`: Individual post card with all sections
- `components/VoicePresetToggle.tsx`: Founder/Company toggle
- `lib/api.ts`: Backend API calls
- `lib/types.ts`: TypeScript interfaces matching backend schemas

### Q: Walk me through page.tsx.
State:
- `voice`: "founder" | "company" (default: "founder")
- `batch`: `BatchResponse | null`
- `error`: `string | null`
- `loading`: boolean (for async operation)
- `isPending`: from `useTransition` (for React state transitions)

Flow:
1. User selects voice, clicks "Generate Posts"
2. `handleGenerate` sets loading, calls `generateBatch(voice)`
3. Result stored via `startTransition(() => setBatch(result))` — keeps UI responsive
4. During loading: shows pulse-animated "Your posts are being generated..." message
5. After loading: renders 5 `PostCard` components in a single-column grid
6. Error: shows error panel

Feedback: `handleFeedback` calls `submitFeedback`, then updates the batch's `feedback_summary` via `startTransition`.

### Q: Why useTransition?
`useTransition` lets React mark the batch state update as non-urgent. This prevents the UI from freezing when rendering 5 complex post cards simultaneously. The `isPending` flag lets us show the loading state while React processes the transition.

### Q: Describe the PostCard component.
Sections (top to bottom):
1. **Header**: Format badge ("mid form"), hook type badge ("contrarian"), trend title, Copy Post button
2. **Hook**: Bold hook text
3. **Body**: Paragraphs split by `\n\n`, rendered with index-based keys (not text-based, to avoid React deduplication of identical paragraphs)
4. **Hashtags**: Chip row
5. **Lint score**: Score pill with number
6. **Lint feedback**: Chip row showing flags or "No lint flags"
7. **Tagging hints**: Entity chips with type, plus reasons underneath
8. **Source grounding**: Links to original trend sources
9. **Similarity matches**: Always visible — score pill with status (clear/review/blocked) + top matches with labels and percentages
10. **Performance feedback**: Behind toggle button. Form with 6 numeric inputs + notes textarea + save button

### Q: Why are paragraph keys index-based instead of using the text content?
In an earlier version, we used paragraph text as React keys: `<p key={paragraph}>`. This caused React to deduplicate paragraphs with identical text — if two paragraphs happened to be the same (e.g., both containing a similar call-to-action), React would only render one. Using `key={idx}` fixes this since indices are always unique.

### Q: Describe the UI design.
Dark premium theme with Apple-like feel:
- **Background**: Dark radial gradient (#0B132B → #1C2541)
- **Panels**: Glassmorphism — `backdrop-filter: blur(16px)`, semi-transparent backgrounds, subtle borders
- **Accent**: Teal/cyan (#5BC0BE) for buttons, active states, highlights
- **Cards**: Rounded corners (24-30px), soft shadows, consistent padding
- **Typography**: Clean hierarchy — landing title, section labels, body text
- **Layout**: Single-column post grid, max-width 720px, centered
- **Animation**: Pulse-fade on generating message

---

## 10. Testing

### Q: What tests exist and why?
7 tests across 4 files:

**test_linting.py** (2 tests):
- `test_lint_flags_missing_credibility_and_weak_hook`: A deliberately bad post (weak hook, vague claims, fluff, hashtag spam, filler CTA, too many tags) should score < 60 and have specific flags
- `test_lint_passes_cleaner_post`: A well-crafted post with metrics, good hook, and proper structure should score >= 80 with no flags

**test_similarity.py** (2 tests):
- `test_similarity_blocks_near_duplicate_text`: Exact copy of corpus text should be blocked (score >= 45)
- `test_similarity_clears_original_text`: Completely original text should be clear (score < 25)

**test_generator.py** (1 test):
- `test_parse_generated_posts_ignores_malformed_tagging_hints`: Tests parser resilience — handles string "Visa" as a hint (rejects it since it's not a dict), keeps valid dict hint for "Ramp", handles comma-separated string hashtags, handles string source_ids

**test_storage.py** (2 tests):
- `test_supabase_probe_uses_schema_specific_columns`: Verifies probe queries use correct columns per table (especially `post_id` for `post_feedback`)
- `test_serialize_post_record_matches_database_columns`: Verifies serialized post has `batch_id`, voice is a string (not enum), and `sources` is excluded

### Q: Why test parser resilience for tagging hints?
LLMs don't always return perfectly structured output. The generator might return:
```json
"tagging_hints": ["Visa", {"entity": "Ramp", "entity_type": "company", "reason": "Mentioned"}]
```
The first element is a bare string (invalid), the second is a proper dict. The parser needs to gracefully skip malformed items. Similarly, hashtags might come as a comma-separated string instead of an array. This test ensures the parser handles real-world LLM output quirks.

---

## 11. Deployment

### Q: How is this deployed?
Three services:

**Render (Backend)**:
- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Python 3.13
- Env vars: `SUPABASE_URL`, `SUPABASE_KEY`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `NEWS_API_KEY`, `FRONTEND_URL`

**Vercel (Frontend)**:
- Root directory: `frontend`
- Framework: Next.js (auto-detected)
- Env var: `NEXT_PUBLIC_BACKEND_URL` pointing to Render URL

**Supabase (Database)**:
- PostgreSQL with the schema from `database/supabase_schema.sql`
- RLS enabled on all 4 tables
- Service-role key used by backend

### Q: How does CORS work?
FastAPI middleware allows origins: the configured `FRONTEND_URL`, plus `http://localhost:3000` and `http://127.0.0.1:3000` for local development.

---

## 12. Python Packages & Why Each One

### Q: Explain each backend dependency.

| Package | Version | Purpose |
|---|---|---|
| **fastapi** | 0.115.12 | Web framework — async support, automatic OpenAPI docs, Pydantic integration for request/response validation |
| **feedparser** | 6.0.11 | RSS/Atom feed parsing for the RSS connector. Handles various feed formats (RSS 2.0, Atom, RDF) |
| **httpx** | 0.28.1 | HTTP client — used for Supabase REST calls (sync) and trend source fetching (async via `AsyncClient`). Chosen over `requests` because it supports both sync and async |
| **openai** | 1.75.0 | Official OpenAI SDK. Used for chat completions with `response_format: json_object` |
| **pydantic** | 2.11.3 | Data validation and serialization. All API schemas (TrendItem, GeneratedPost, etc.) are Pydantic models. `model_dump(mode="json")` for serialization |
| **pydantic-settings** | 2.8.1 | Environment variable loading. `BaseSettings` with `.env` file support. Typed config with defaults |
| **python-dotenv** | 1.1.0 | Loads `.env` files into environment. Used by pydantic-settings under the hood |
| **uvicorn[standard]** | 0.34.0 | ASGI server to run FastAPI. `[standard]` includes uvloop and httptools for better performance |

### Q: Why httpx instead of requests?
httpx supports both sync and async HTTP calls. We need:
- **Async**: For parallel trend fetching (`asyncio.gather` with `httpx.AsyncClient`)
- **Sync**: For Supabase REST calls in the storage service (simpler sync flow)

With `requests`, we'd need a separate async library (like `aiohttp`) for the trend fetching. httpx does both.

### Q: Why feedparser and not just httpx + XML parsing?
RSS/Atom feeds have many format variations (RSS 2.0, Atom, RDF, various date formats). `feedparser` handles all of these transparently. It normalizes entries, handles encoding, and parses dates. Writing a custom XML parser would be fragile and bug-prone.

---

## 13. Design Decisions & Tradeoffs

### Q: Why Supabase REST instead of the Python SDK?
Newer `sb_secret_` keys have JWT parsing issues in the Python SDK. Raw REST via httpx with `apikey` header is:
- Simpler (no SDK dependency)
- More reliable (no JWT parsing)
- Guaranteed to work with any key format
- Full control over error handling

### Q: Why OpenAI only? Why not support multiple providers?
Single provider avoids abstraction complexity. Adding a multi-provider abstraction would mean:
- Different response formats to normalize
- Different error handling per provider
- Different structured output capabilities
- Extra config complexity for no current benefit

The model is configurable via `OPENAI_MODEL` env var, so upgrading models is a one-line change.

### Q: Why no local fallback by default?
`ALLOW_LOCAL_DEV_FALLBACK=false` because production must fail clearly if the database is missing. Silent local file storage would mask configuration errors and make debugging harder. The local fallback exists only for development convenience.

### Q: Why no mock generation?
If OpenAI isn't configured, returning fake posts would give a false sense of functionality. The system returns 503 with a clear error message instead. This ensures deployment issues are caught immediately.

### Q: Why separate the trend brief from generation?
The trend brief endpoint (`GET /api/trends/brief`) can be called independently. This separation:
- Allows debugging trend fetching independently of generation
- Lets the frontend potentially show trends before generating
- Makes the system more testable
- Follows single-responsibility principle

### Q: Why JSONB over normalized tables for lint/similarity/tags?
These fields are:
- Always read as a unit (never queried individually)
- Variable in structure (lint might have 0-9 flags)
- Nested (similarity has matches, each with score and label)

JSONB avoids creating 3+ join tables for data that's never queried at the column level. If we needed to query "all posts with similarity > 40%", we could use JSONB operators: `similarity->>'max_score' > '40'`.

### Q: How would you scale this system?
Current bottleneck is the OpenAI call (~10-15 seconds). Scaling options:
1. **Caching**: Cache trend briefs for a short TTL to avoid redundant source fetching
2. **Queue**: For high volume, use a task queue (Celery/Redis) so generation happens asynchronously
3. **Connection pooling**: Use httpx connection pools for Supabase calls
4. **CDN**: Put the frontend behind Vercel's edge network (already done)
5. **Read replicas**: Supabase supports read replicas for heavy read loads

### Q: What would you change with more time?
1. **Embedding-based similarity**: Replace token/shingle/cosine with vector embeddings for more semantic similarity detection
2. **A/B testing**: Track which voice/hook_type/format combinations perform best and auto-adjust weights
3. **Scheduling**: Let users schedule posts with optimal timing based on audience engagement patterns
4. **Multi-tenant**: Add auth and per-user feedback loops
5. **Streaming**: Stream generation progress to the frontend via SSE

---

## 14. Security

### Q: How is the database secured?
- **RLS**: All four tables have Row Level Security enabled. Only `service_role` can read/write.
- **Key validation**: Backend rejects `sb_publishable_` keys at startup. Only `sb_secret_` or `service_role` keys are accepted.
- **No browser access**: Even with the Supabase URL, the browser can't query directly — it would use the anon key, which RLS blocks.
- **API keys**: All secrets (`OPENAI_API_KEY`, `SUPABASE_KEY`, `NEWS_API_KEY`) are in environment variables, never in code.

### Q: What about API rate limiting?
Currently relies on Render's built-in protections. For production at scale, you'd add:
- Rate limiting middleware in FastAPI
- Per-IP throttling for the generate endpoint
- OpenAI API rate limit handling with exponential backoff

---

## 15. Common Follow-up Questions

### Q: What was the hardest technical challenge?
The quality pipeline calibration. The credibility linter initially only checked for hard metrics ($, %, years), so every strategy/framework post got flagged. We added a named authority regex (SEC, McKinsey, Bloomberg, etc.) as an alternative check. Then it was too broad — generic words like "framework" and "onboarding" matched. The final version only accepts named authoritative sources that genuinely signal credibility.

### Q: How do you ensure generated posts are grounded in real trends?
Three safeguards:
1. The generation prompt says: "If a fact is not in the trend brief, do not invent it"
2. Each post's `source_ids` must reference actual trend IDs from the brief
3. `source_grounding` links in the UI let users verify each claim against the original source

### Q: What's the difference between founder and company voice?
**Founder voice**: "Most diligence bottlenecks are still handoff problems, not model problems." — Sharp, opinionated, first-person operator perspective. Uses contrarian hooks, speaks from direct experience.

**Company voice**: "Three patterns emerging in Q1 2026 deal automation that operations leaders should track." — Measured, educational, third-person. Uses framework hooks, positions the company as a category authority.

### Q: How do you handle LLM output that doesn't match the expected schema?
The parser in `generator.py` is defensive at every level:
- `_coerce_tagging_hints`: Skips non-dict items, validates entity_type is "company"|"person"
- `_coerce_string_list`: Handles arrays or comma-separated strings
- `_coerce_post_format`: Defaults to "mid" if invalid
- Trend ID fallback: If returned trend_id isn't in the source map, uses the first available trend
- Hook/body: Converts non-strings with `str()`, strips whitespace
- Validation: If the parsed result has wrong count or duplicates, retries with the specific failure reason

### Q: How many trend items typically come in?
~75+ per fetch cycle:
- Hacker News: ~19 (top 20 minus items without URLs)
- News API: ~20 (if key configured)
- RSS: ~36 (6 entries × ~6 successful feeds out of 10)
- Reddit: Variable (4 posts × 5 subreddits, depends on subreddit activity)

After deduplication, typically 60-70 unique items. The trend brief selects the top 8 by score.

### Q: What metrics do you track for each trend?
Each `TrendItem` has:
- `score`: keyword_relevance × source_weight + freshness_bonus
- `relevance_reason`: Human-readable explanation (e.g., "Signals automation workflow change; Directly relevant to finance and fintech operators")
- `tags`: Derived tags like "Fintech", "Automation", "Banking"
- `fingerprint`: SHA1 hash for deduplication
- `published_at`: Original publication timestamp for freshness scoring
