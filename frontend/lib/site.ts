// Single source of truth for site copy, structured data and /llms.txt, so the
// human page, the JSON-LD and the machine-readable summary can never drift.

export const SITE_URL = "https://netpost.rianfernando.com";
export const SITE_NAME = "Netpost";
export const GITHUB_URL = "https://github.com/Rian-Fernando/LindedIn-Generator";
export const AUTHOR_NAME = "Rian Fernando";
export const AUTHOR_URL = "https://rianfernando.com";

export const SITE_TITLE = "Netpost — LinkedIn Post Generator for Fintech & Investment Banking";

/** Deliberately plain and extractable — AI answer engines quote sentences like this. */
export const SITE_DESCRIPTION =
  "Netpost is a free, no-login LinkedIn post generator for B2B fintech and investment banking teams. Every click pulls live industry trends from Hacker News, Reddit, RSS and News API, then writes five posts grounded in those sources.";

export const SITE_TAGLINE = "Five source-grounded LinkedIn posts per click. No login, no AI slop.";

export type Feature = {
  title: string;
  body: string;
};

export const FEATURES: Feature[] = [
  {
    title: "Live trend ingestion",
    body: "Every generation fetches fresh items in parallel from Hacker News, 11 finance and technology subreddits, 10 industry RSS feeds, and News API. Nothing is cached between clicks, so posts reflect what was published today."
  },
  {
    title: "Dedupe and relevance scoring",
    body: "Items are fingerprinted with SHA-1 hashes of normalized titles to drop near-duplicates, then scored on keyword relevance multiplied by source weight, plus a freshness bonus for anything under 24 hours old. The top 5–10 items become the trend brief."
  },
  {
    title: "Researched style patterns",
    body: "A curated corpus of high-performing B2B creator patterns supplies the hook types, structures, credibility moves and pacing that actually perform on LinkedIn. The corpus stores pattern summaries only — never copied posts."
  },
  {
    title: "Two brand voices",
    body: "Founder voice is sharper, more opinionated and operator-led. Company voice is measured, educational and category-authoritative. Both draw from the same trend brief."
  },
  {
    title: "Anti-slop linting",
    body: "Each post is scored out of 100 and flagged for weak hooks, vague claims, filler CTAs, hashtag spam, missing credibility and unreadable paragraph length — the tells that make writing read as machine-generated."
  },
  {
    title: "Similarity checking",
    body: "Every draft is compared against the style corpus and your recent posts using token overlap, 3-gram shingles and cosine similarity. Anything scoring 45 or above is blocked before you ever see it as publishable."
  },
  {
    title: "Source grounding",
    body: "Each post carries the trend it came from and links back to the original articles, so any claim can be checked against its source before you publish."
  },
  {
    title: "Performance feedback loop",
    body: "Record impressions, reactions, comments, reposts, saves and clicks on posts you publish. Netpost summarizes what worked by hook type, format and voice, and feeds that into the next batch."
  }
];

export type FaqItem = {
  question: string;
  answer: string;
};

export const FAQ: FaqItem[] = [
  {
    question: "What is Netpost?",
    answer:
      "Netpost is a free LinkedIn post generator built for B2B fintech and investment banking teams. It pulls live industry trends, layers in researched style patterns from high-performing B2B creators, and returns five ready-to-edit posts per click."
  },
  {
    question: "How does Netpost work?",
    answer:
      "Netpost runs a four-stage pipeline. It ingests items in parallel from Hacker News, Reddit, RSS feeds and News API; deduplicates them with SHA-1 title fingerprints and ranks them by keyword relevance, source weight and freshness; builds a trend brief of 5–10 items; then generates five posts with OpenAI, each mapped to a different trend and checked by a linter and a similarity checker before it is returned."
  },
  {
    question: "Is Netpost free, and do I need an account?",
    answer:
      "Yes, Netpost is free and there is no login, no account and no signup. Open the site, pick a voice, and press Generate Posts."
  },
  {
    question: "Where do the trends come from?",
    answer:
      "Four public sources: the Hacker News top stories, 11 finance and technology subreddits, 10 industry RSS feeds including Finextra, PYMNTS, American Banker, Banking Dive and Finovate, and News API. Roughly 75 items are fetched per run and ranked down to the strongest 5–10."
  },
  {
    question: "How does Netpost avoid generic AI writing?",
    answer:
      "Three mechanisms. A linter scores each post out of 100 and flags weak hooks, vague claims, filler CTAs and missing credibility. A similarity checker blocks drafts that are too close to the style corpus or your recent posts. And every batch carries a unique nonce, fresh angle targets and a list of recent hooks to avoid, so repeat clicks do not converge on the same phrasing."
  },
  {
    question: "What is the difference between founder voice and company voice?",
    answer:
      "Founder voice writes as an operator: sharper, more opinionated, first-person and willing to take a position. Company voice writes as the brand: measured, educational and category-authoritative. Both are grounded in the same live trend brief."
  }
];

export const TECH_STACK = [
  { layer: "Frontend", detail: "Next.js 15 App Router, React 18, TypeScript, three.js", host: "Vercel" },
  { layer: "Backend", detail: "FastAPI, Python, httpx, feedparser", host: "Render" },
  { layer: "Database", detail: "Supabase (PostgreSQL) via REST", host: "Supabase" },
  { layer: "Generation", detail: "OpenAI chat completions with structured JSON output", host: "OpenAI" }
];
