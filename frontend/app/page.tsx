import type { Metadata } from "next";

import { Generator } from "../components/Generator";
import { NetpostMark } from "../components/NetpostMark";
import { SceneMount } from "../components/SceneMount";
import {
  AUTHOR_NAME,
  AUTHOR_URL,
  FAQ,
  FEATURES,
  GITHUB_URL,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
  TECH_STACK
} from "../lib/site";

export const metadata: Metadata = {
  title: {
    absolute: SITE_TITLE
  },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" }
};

const PIPELINE = [
  {
    step: "01",
    title: "Ingest",
    body: "Roughly 75 items per run are fetched in parallel from Hacker News, 11 subreddits, 10 industry RSS feeds and News API. No API keys are needed for the first three."
  },
  {
    step: "02",
    title: "Dedupe and score",
    body: "Normalized titles are hashed to SHA-1 fingerprints to drop near-duplicates. What survives is scored on keyword relevance × source weight, plus a freshness bonus of up to 2.0 for items under 24 hours old."
  },
  {
    step: "03",
    title: "Brief",
    body: "The top 5–10 items become the trend brief, each tagged (Fintech, Automation, Banking) and carrying a plain-language reason it was ranked where it was."
  },
  {
    step: "04",
    title: "Draft and check",
    body: "Five posts are generated, each mapped to a different trend, then run through the linter and the similarity checker. Anything duplicated or too close to prior work is regenerated, up to three attempts."
  }
];

const SOURCES = [
  { name: "Hacker News", detail: "Top 20 stories", weight: "1.1" },
  { name: "Reddit", detail: "4 posts × 11 subreddits", weight: "0.95" },
  { name: "RSS", detail: "6 entries × 10 industry feeds", weight: "1.2" },
  { name: "Company blogs", detail: "Changelogs and releases via RSS", weight: "1.3" },
  { name: "News API", detail: "Up to 20 articles", weight: "1.4" }
];

export default function Page() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": `${SITE_URL}/#app`,
        name: SITE_NAME,
        alternateName: "Netpost LinkedIn Post Generator",
        description: SITE_DESCRIPTION,
        url: SITE_URL,
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "Content Marketing",
        operatingSystem: "Web browser",
        browserRequirements: "Requires JavaScript.",
        featureList: FEATURES.map((f) => f.title),
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock"
        },
        author: {
          "@type": "Person",
          name: AUTHOR_NAME,
          url: AUTHOR_URL
        },
        publisher: {
          "@type": "Person",
          name: AUTHOR_NAME,
          url: AUTHOR_URL
        },
        isAccessibleForFree: true,
        softwareHelp: `${SITE_URL}/how-it-works`,
        codeRepository: GITHUB_URL
      },
      {
        "@type": "FAQPage",
        "@id": `${SITE_URL}/#faq`,
        mainEntity: FAQ.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer
          }
        }))
      }
    ]
  };

  return (
    <>
      <SceneMount />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="page-shell" id="main">
        <section className="landing" id="top">
          <div className="brand-lockup">
            <NetpostMark className="brand-mark" size={72} title="Netpost logo" />
            <h1 className="brand-wordmark">netpost</h1>
            <p className="brand-subtitle">LinkedIn Post Generator</p>
          </div>

          <p className="landing-lede">
            Netpost writes five LinkedIn posts per click for B2B fintech and investment banking
            teams. Each one is grounded in a live industry trend pulled seconds earlier, checked
            against a linter for AI-sounding filler, and linked back to its source. No login, no
            account, free to use.
          </p>

          <Generator />
        </section>

        <section aria-labelledby="what-heading" className="scroll-section">
          <p className="section-eyebrow">What it is</p>
          <h2 id="what-heading">A trend-aware writing pipeline, not a prompt box</h2>
          <p className="section-lede">
            Most AI writing tools start from a blank prompt and produce confident, sourceless
            copy. Netpost starts from what the industry actually published today. It reads live
            trends, ranks them, and writes only about the ones that scored — then shows you the
            score, the flags and the links so you can check it.
          </p>
          <dl className="stat-strip">
            <div className="stat-cell">
              <dt>Items ingested per run</dt>
              <dd>~75</dd>
            </div>
            <div className="stat-cell">
              <dt>Live sources</dt>
              <dd>4</dd>
            </div>
            <div className="stat-cell">
              <dt>Posts per click</dt>
              <dd>5</dd>
            </div>
            <div className="stat-cell">
              <dt>Login required</dt>
              <dd>None</dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="pipeline-heading" className="scroll-section">
          <p className="section-eyebrow">The pipeline</p>
          <h2 id="pipeline-heading">Four stages, run fresh on every click</h2>
          <ol className="pipeline-list">
            {PIPELINE.map((stage) => (
              <li className="pipeline-item" key={stage.step}>
                <span aria-hidden="true" className="pipeline-step">
                  {stage.step}
                </span>
                <div>
                  <h3>{stage.title}</h3>
                  <p>{stage.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="sources-heading" className="scroll-section">
          <p className="section-eyebrow">Where the signal comes from</p>
          <h2 id="sources-heading">Five live inputs, weighted by reliability</h2>
          <p className="section-lede">
            Sources are weighted before ranking, so a trade-publication story outranks a forum
            thread on the same topic. Company blogs and changelogs are supported through
            configurable RSS entries rather than a separate connector.
          </p>
          <div className="table-scroll">
            <table className="data-table">
              <caption className="visually-hidden">
                Netpost trend sources and their scoring weights
              </caption>
              <thead>
                <tr>
                  <th scope="col">Source</th>
                  <th scope="col">Per run</th>
                  <th scope="col">Weight</th>
                </tr>
              </thead>
              <tbody>
                {SOURCES.map((source) => (
                  <tr key={source.name}>
                    <th scope="row">{source.name}</th>
                    <td>{source.detail}</td>
                    <td>{source.weight}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="features-heading" className="scroll-section">
          <p className="section-eyebrow">What you get</p>
          <h2 id="features-heading">Every post arrives with its evidence attached</h2>
          <div className="feature-grid">
            {FEATURES.map((feature) => (
              <article className="feature-card" key={feature.title}>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="stack-heading" className="scroll-section">
          <p className="section-eyebrow">How it is built</p>
          <h2 id="stack-heading">Tech stack</h2>
          <div className="table-scroll">
            <table className="data-table">
              <caption className="visually-hidden">Netpost technology stack by layer</caption>
              <thead>
                <tr>
                  <th scope="col">Layer</th>
                  <th scope="col">Stack</th>
                  <th scope="col">Host</th>
                </tr>
              </thead>
              <tbody>
                {TECH_STACK.map((row) => (
                  <tr key={row.layer}>
                    <th scope="row">{row.layer}</th>
                    <td>{row.detail}</td>
                    <td>{row.host}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="section-note">
            A deeper breakdown of the scoring maths, the linter rules and the similarity
            thresholds lives in <a href="/how-it-works">how Netpost works</a>.
          </p>
        </section>

        <section aria-labelledby="faq-heading" className="scroll-section">
          <p className="section-eyebrow">Questions</p>
          <h2 id="faq-heading">Frequently asked questions</h2>
          <div className="faq-list">
            {FAQ.map((item) => (
              <details className="faq-item" key={item.question}>
                <summary>
                  <h3>{item.question}</h3>
                </summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section aria-labelledby="cta-heading" className="scroll-section cta-section">
          <h2 id="cta-heading">Generate your next five posts</h2>
          <p className="section-lede">
            Pick a voice, press the button, and read the trend brief behind every draft.
          </p>
          <a className="cta-link" href="#top">
            Back to the generator
          </a>
        </section>
      </main>
    </>
  );
}
