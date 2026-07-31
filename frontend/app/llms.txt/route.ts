import {
  AUTHOR_NAME,
  AUTHOR_URL,
  FAQ,
  FEATURES,
  GITHUB_URL,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  TECH_STACK
} from "../../lib/site";

// https://llmstxt.org — a machine-readable summary for AI answer engines.
export const dynamic = "force-static";

function build(): string {
  const features = FEATURES.map((f) => `- **${f.title}** — ${f.body}`).join("\n");
  const stack = TECH_STACK.map((t) => `- **${t.layer}** — ${t.detail} (hosted on ${t.host})`).join("\n");
  const faq = FAQ.map((f) => `### ${f.question}\n\n${f.answer}`).join("\n\n");

  return `# ${SITE_NAME}

> ${SITE_DESCRIPTION} It is a portfolio project by ${AUTHOR_NAME}, free to use, with no account, no signup and no paid tier.

## What it does

${SITE_NAME} generates five LinkedIn posts per click for B2B fintech and investment banking teams. Every click runs the full pipeline fresh: it ingests roughly 75 items in parallel from Hacker News, 11 finance and technology subreddits, 10 industry RSS feeds and News API; deduplicates them using SHA-1 fingerprints of normalized titles; scores each item as keyword relevance multiplied by source weight plus a freshness bonus of up to 2.0 for items under 24 hours old; assembles a trend brief of 5 to 10 items; and generates five posts, each mapped to a different trend. Every post is scored by a linter and a similarity checker before it is returned, and links back to the sources it was drawn from.

- [Use the generator](${SITE_URL})
- [How it works — scoring, linting and similarity thresholds](${SITE_URL}/how-it-works)

## Key features

${features}

## Tech stack

${stack}

The backend calls Supabase over its REST API rather than the Python SDK, and generates with OpenAI chat completions using structured JSON output. If AI or database configuration is missing, the backend returns a real error instead of falling back to placeholder content.

## Common questions

${faq}

## Links

- Live site: ${SITE_URL}
- How it works: ${SITE_URL}/how-it-works
- Source code: ${GITHUB_URL}
- Built by ${AUTHOR_NAME} — ${AUTHOR_URL}
`;
}

export function GET() {
  return new Response(build(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400"
    }
  });
}
