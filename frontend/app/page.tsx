"use client";

import { useEffect, useState, useTransition } from "react";

import { PostCard } from "../components/PostCard";
import { TrendBrief } from "../components/TrendBrief";
import { VoicePresetToggle } from "../components/VoicePresetToggle";
import { fetchStyleGuide, generateBatch, submitFeedback } from "../lib/api";
import type { BatchResponse, FeedbackPayload, StyleGuideResponse, VoicePreset } from "../lib/types";

export default function Page() {
  const [voice, setVoice] = useState<VoicePreset>("founder");
  const [batch, setBatch] = useState<BatchResponse | null>(null);
  const [styleGuide, setStyleGuide] = useState<StyleGuideResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const capabilityTiles = [
    {
      value: "5",
      label: "posts per batch",
      detail: "Every click produces a new live set instead of recycling templates."
    },
    {
      value: "Live",
      label: "source intake",
      detail: "Reddit, Hacker News, RSS, and optional News API coverage."
    },
    {
      value: "Top 1%",
      label: "quality target",
      detail: "Linting, similarity checks, and source grounding stay in the loop."
    }
  ];

  const controlChecks = [
    "OpenAI generation grounded in fresh market inputs",
    "Supabase-backed feedback loop and saved batches",
    "Brand voice switching for founder and company modes"
  ];

  useEffect(() => {
    fetchStyleGuide()
      .then(setStyleGuide)
      .catch((err: Error) => setError(err.message));
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateBatch(voice);
      startTransition(() => setBatch(result));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate posts.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (payload: FeedbackPayload) => {
    const response = await submitFeedback(payload);
    startTransition(() => {
      setBatch((current) =>
        current
          ? {
              ...current,
              feedback_summary: response.feedback_summary
            }
          : current
      );
    });
    return response.feedback_summary;
  };

  return (
    <main className="page-shell">
      <section className="hero panel">
        <div className="hero-copy">
          <p className="eyebrow">Investment Banking x Fintech Automation</p>
          <h1>Dark-mode content ops for founder-grade LinkedIn output.</h1>
          <p className="hero-text">
            A premium generation cockpit for authentic B2B posts: one click pulls live
            signals, writes five structured drafts, scores them, and carries performance
            learning forward.
          </p>
          <div className="hero-chip-row">
            <span className="chip chip-highlight">Fresh on every click</span>
            <span className="chip">No login required</span>
            <span className="chip">Source-grounded output</span>
          </div>
          <div className="hero-stat-grid">
            {capabilityTiles.map((tile) => (
              <article className="hero-stat-card" key={tile.label}>
                <p className="hero-stat-value">{tile.value}</p>
                <p className="hero-stat-label">{tile.label}</p>
                <p className="hero-stat-copy">{tile.detail}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="hero-actions">
          <div className="console-card">
            <p className="eyebrow">Generation Console</p>
            <h2>Choose the voice, then spin a fresh batch.</h2>
            <p className="muted">
              The system pulls a live trend brief first, then generates five posts with
              lint scoring, tagging hints, and originality checks.
            </p>
          </div>
          <VoicePresetToggle onChange={setVoice} value={voice} />
          <button
            className="primary-button"
            disabled={loading || isPending}
            onClick={handleGenerate}
            type="button"
          >
            {loading || isPending ? "Generating fresh batch..." : "Generate 5 Posts"}
          </button>
          <div className="status-list">
            {controlChecks.map((item) => (
              <div className="status-item" key={item}>
                <span className="status-dot" />
                <p>{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {error ? (
        <section className="panel error-panel">
          <p className="eyebrow">Pipeline Error</p>
          <p>{error}</p>
        </section>
      ) : null}

      {styleGuide ? (
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Pattern Learning</p>
              <h2>Research-backed guardrails behind every draft</h2>
              <p className="panel-copy">
                The generator follows creator-level structure patterns without copying
                any single source. These are the behaviors shaping the batch.
              </p>
            </div>
          </div>
          <div className="summary-grid">
            {Object.entries(styleGuide.pattern_summary).map(([key, values]) => (
              <div className="summary-card" key={key}>
                <p className="section-label">{key.replace(/_/g, " ")}</p>
                <div className="chip-row">
                  {values.map((value) => (
                    <span className="chip" key={value}>
                      {value}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {batch ? (
        <>
          <section className="panel batch-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Batch Ready</p>
                <h2>Fresh posts grounded in live source material</h2>
                <p className="panel-copy">
                  Batch {batch.batch_id.slice(0, 8)} generated{" "}
                  {new Date(batch.generated_at).toLocaleString()}.
                </p>
              </div>
              <div className="meta-pill-row">
                <span className="meta-pill">{batch.voice} voice</span>
                <span className="meta-pill">{batch.posts.length} posts</span>
                <span className="meta-pill">{batch.trend_brief.fresh_count} fresh trends</span>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Performance Loop</p>
                <h2>What the system is carrying forward</h2>
              </div>
            </div>
            <p className="hero-text">{batch.feedback_summary}</p>
          </section>

          <TrendBrief brief={batch.trend_brief} />

          <section className="posts-grid">
            {batch.posts.map((post) => (
              <PostCard key={post.id} onSubmitFeedback={handleFeedback} post={post} />
            ))}
          </section>
        </>
      ) : null}
    </main>
  );
}
