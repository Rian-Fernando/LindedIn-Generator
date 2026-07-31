import type { Metadata } from "next";

import {
  AUTHOR_NAME,
  AUTHOR_URL,
  GITHUB_URL,
  SITE_NAME,
  SITE_URL
} from "../../lib/site";

const TITLE = "How Netpost Works — Trend Scoring, Linting and Similarity Checks";
const DESCRIPTION =
  "A technical breakdown of the Netpost pipeline: how trend items are scored by keyword relevance, source weight and freshness; how the anti-slop linter grades each post out of 100; and how the similarity checker blocks near-duplicate drafts.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/how-it-works" },
  openGraph: {
    type: "article",
    url: `${SITE_URL}/how-it-works`,
    title: TITLE,
    description: DESCRIPTION
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION
  }
};

const KEYWORDS = [
  ["fintech", "2.5"],
  ["automation", "2.3"],
  ["banking", "2.0"],
  ["investment", "2.0"],
  ["underwriting", "1.8"],
  ["diligence", "1.8"],
  ["deal", "1.8"],
  ["workflow", "1.8"],
  ["ai", "1.7"],
  ["compliance", "1.7"],
  ["payments", "1.6"],
  ["agent", "1.5"],
  ["fraud", "1.4"],
  ["data", "1.2"]
];

const LINT_RULES = [
  {
    rule: "Weak hook",
    detail: "Opens with \"I\", \"In my experience\" or \"As a\" — the openers that signal a post nobody will stop scrolling for."
  },
  {
    rule: "Vague claims",
    detail: "\"Amazing\", \"incredible\", \"game-changing\" and similar adjectives that assert impact without evidence."
  },
  {
    rule: "Generic filler",
    detail: "\"A lot of\", \"everyone knows\" and other phrases that take up space without adding information."
  },
  {
    rule: "Missing credibility",
    detail: "No metric and no named authority. A post should cite a number or a source like the SEC, McKinsey or Bloomberg."
  },
  {
    rule: "Poor readability",
    detail: "Fewer than three paragraphs, or any single paragraph over 65 words. LinkedIn is read on phones."
  },
  {
    rule: "Hashtag spam",
    detail: "More than five hashtags."
  },
  {
    rule: "Filler CTA",
    detail: "\"Feel free to\", \"hope this helps\" and other soft closers that ask for nothing."
  },
  {
    rule: "Corporate conclusion",
    detail: "\"In conclusion\", \"to summarize\" — essay scaffolding that does not belong in a feed."
  },
  {
    rule: "Too many tags",
    detail: "More than two tagging hints."
  }
];

export default function HowItWorksPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "@id": `${SITE_URL}/how-it-works#article`,
    headline: "How Netpost Works",
    description: DESCRIPTION,
    url: `${SITE_URL}/how-it-works`,
    about: SITE_NAME,
    author: { "@type": "Person", name: AUTHOR_NAME, url: AUTHOR_URL },
    publisher: { "@type": "Person", name: AUTHOR_NAME, url: AUTHOR_URL },
    isPartOf: { "@id": `${SITE_URL}/#website` },
    codeRepository: GITHUB_URL
  };

  return (
    <main className="page-shell doc-page" id="main">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="doc-header">
        <p className="section-eyebrow">Technical breakdown</p>
        <h1>How Netpost works</h1>
        <p className="section-lede">
          Netpost turns roughly 75 live industry items into five publishable LinkedIn posts in a
          single request. This page documents the scoring maths, the linter rules and the
          similarity thresholds that decide what actually reaches you.
        </p>
      </header>

      <section aria-labelledby="scoring-heading" className="scroll-section">
        <h2 id="scoring-heading">Trend scoring</h2>
        <p>
          Every ingested item is scored with the same formula:{" "}
          <code>keyword relevance × source weight + freshness bonus</code>. Keyword relevance sums
          the weights of the scoring terms found in the item&apos;s title and summary. The
          freshness bonus rewards recency on a linear ramp —{" "}
          <code>max(0, 24 − min(age_hours, 24)) / 12</code> — worth up to 2.0 for something
          published in the last few minutes and nothing at all after 24 hours.
        </p>

        <h3>Keyword weights</h3>
        <div className="table-scroll">
          <table className="data-table">
            <caption className="visually-hidden">Trend scoring keywords and weights</caption>
            <thead>
              <tr>
                <th scope="col">Keyword</th>
                <th scope="col">Weight</th>
              </tr>
            </thead>
            <tbody>
              {KEYWORDS.map(([word, weight]) => (
                <tr key={word}>
                  <th scope="row">{word}</th>
                  <td>{weight}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3>Deduplication</h3>
        <p>
          Titles are lowercased and stripped of punctuation, then hashed to a SHA-1 fingerprint.
          Matching fingerprints collapse to a single item, which is what keeps a story syndicated
          across five outlets from occupying five slots in the brief.
        </p>
      </section>

      <section aria-labelledby="lint-heading" className="scroll-section">
        <h2 id="lint-heading">The anti-slop linter</h2>
        <p>
          Each generated post starts at 100 and loses points for every flag raised. The score and
          the flags are shown on the card, so the judgement is visible rather than hidden behind a
          silent filter.
        </p>
        <div className="table-scroll">
          <table className="data-table">
            <caption className="visually-hidden">Linter rules and what each one catches</caption>
            <thead>
              <tr>
                <th scope="col">Flag</th>
                <th scope="col">What it catches</th>
              </tr>
            </thead>
            <tbody>
              {LINT_RULES.map((row) => (
                <tr key={row.rule}>
                  <th scope="row">{row.rule}</th>
                  <td>{row.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="similarity-heading" className="scroll-section">
        <h2 id="similarity-heading">Similarity checking</h2>
        <p>
          Every draft is compared against the style corpus and previously generated posts using a
          weighted blend: 35% token overlap (Jaccard), 40% shingle overlap on 3-grams, and 25%
          cosine similarity. The blended score maps to three states.
        </p>
        <ul className="threshold-list">
          <li>
            <strong>Below 25 — clear.</strong> The draft is materially different from anything it
            was compared against.
          </li>
          <li>
            <strong>25 to 45 — review.</strong> Close enough to a known pattern to be worth a read
            before publishing. The matches are shown on the card.
          </li>
          <li>
            <strong>45 and above — blocked.</strong> The batch is regenerated, up to three
            attempts, before the request fails with a real error.
          </li>
        </ul>
      </section>

      <section aria-labelledby="freshness-heading" className="scroll-section">
        <h2 id="freshness-heading">Why repeat clicks do not repeat themselves</h2>
        <p>
          Freshness is enforced rather than hoped for. Each batch carries a UUID nonce, a fresh
          angle target drawn from eight banking-specific framings, and a list of recently
          generated hooks the model is instructed to avoid. Trend IDs used in recent batches are
          rotated out when enough alternatives exist, and duplicate content within a single batch
          is rejected outright.
        </p>
      </section>

      <section aria-labelledby="stack-heading" className="scroll-section">
        <h2 id="stack-heading">Architecture</h2>
        <p>
          The Next.js frontend on Vercel calls a FastAPI backend on Render, which fans out to the
          trend sources with <code>asyncio.gather</code>, generates through the OpenAI chat
          completions API with structured JSON output, and persists trend events, batches, posts
          and feedback to Supabase over its REST API. If AI or database configuration is missing,
          the backend fails loudly with a real error rather than serving placeholder content.
        </p>
        <p className="section-note">
          Source is on <a href={GITHUB_URL} rel="noopener">GitHub</a>. Back to{" "}
          <a href="/">the generator</a>.
        </p>
      </section>
    </main>
  );
}
