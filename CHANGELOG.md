# Changelog

All notable changes to Netpost are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/), and the project aims to follow
[Semantic Versioning](https://semver.org/).

## [1.1.0] — 2026-07-30

### Landing page
- Scroll-driven three.js backdrop rendering the actual pipeline: four source
  clusters stream into a scoring core and resolve into five post panels whose
  stacked bars echo the Netpost mark. Keyframed camera path, gentle bloom,
  pointer parallax, and a single static frame under `prefers-reduced-motion`.
- Home page rebuilt as a server-rendered document — what it is, the four
  pipeline stages, the weighted source table, eight capability cards, the tech
  stack and an FAQ — with the generator as a client island.
- New `/how-it-works` page documenting the scoring formula, keyword weights,
  the nine linter rules and the similarity thresholds.

### Discoverability
- `/llms.txt` following the [llms.txt convention](https://llmstxt.org), served
  static from a single shared copy source.
- `robots.txt` now names the major AI crawlers explicitly (GPTBot,
  OAI-SearchBot, ChatGPT-User, ClaudeBot, PerplexityBot, Google-Extended,
  Applebot-Extended, CCBot, Amazonbot, Bytespider, cohere-ai and others).
- JSON-LD split across a sitewide `WebSite`/`Person` graph, a `WebApplication`
  and `FAQPage` on the home page, and a `TechArticle` on `/how-it-works`.
- Sitemap covers both pages; canonicals pin to `netpost.rianfernando.com`.

### Accessibility
- Skip link, real `<nav>`/`<main>`/`<footer>` landmarks, one `<h1>` per page,
  visible focus rings, `aria-live` generation status and `aria-pressed` voice
  toggles.

## [1.0.0] — 2026-05-30

First tagged release. Netpost is a no-login LinkedIn post generator for B2B
fintech and investment banking teams.

### Trend pipeline
- Parallel ingestion via `asyncio.gather` from Hacker News (top 20), Reddit
  (4 posts × 11 subreddits), 10 industry RSS feeds (6 entries each) and News
  API (up to 20 articles).
- SHA-1 fingerprint deduplication on normalized titles.
- Relevance scoring as keyword weight × source weight plus a freshness bonus of
  up to 2.0 for items under 24 hours old, with a per-item relevance reason and
  derived Fintech / Automation / Banking tags.
- Company blogs and changelogs supported through configurable `RSS_FEEDS_JSON`
  entries rather than a separate connector.

### Generation
- Exactly five posts per batch, each mapped to a different trend where possible.
- Freshness enforcement: per-batch UUID nonce, fresh angle targets from eight
  banking-specific framings, recent-hook avoidance, trend-ID rotation, and up to
  three regeneration attempts before a clear runtime error.
- Founder and company brand voice presets.

### Quality
- Anti-slop linter scoring out of 100 across nine flags: weak hooks, vague
  claims, generic filler, missing credibility, poor readability, hashtag spam,
  filler CTAs, corporate conclusions and excess tagging.
- Similarity checker blending 35% token overlap, 40% 3-gram shingles and 25%
  cosine similarity, with clear / review / blocked thresholds at 25 and 45.
- Performance feedback loop recording impressions, reactions, comments,
  reposts, saves and clicks, summarized by hook type, format and voice and
  injected into the next generation prompt.

### Platform
- FastAPI backend on Render; Next.js App Router frontend on Vercel; Supabase
  persistence over the REST API with schema-aware readiness probes.
- Brand identity: logo, high-contrast favicon, apple-touch icon, theme tokens.
- Base SEO: sitemap, robots, generated 1200×630 Open Graph PNG, canonical URL.
- 7 backend tests across linting, similarity, generation parsing and storage.
