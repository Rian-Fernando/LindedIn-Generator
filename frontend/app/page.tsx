"use client";

import { useState, useTransition } from "react";

import { PostCard } from "../components/PostCard";
import { TrendBrief } from "../components/TrendBrief";
import { generateBatch, submitFeedback } from "../lib/api";
import type { BatchResponse, FeedbackPayload, VoicePreset } from "../lib/types";

export default function Page() {
  const [voice, setVoice] = useState<VoicePreset>("founder");
  const [batch, setBatch] = useState<BatchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

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
          ? { ...current, feedback_summary: response.feedback_summary }
          : current
      );
    });
    return response.feedback_summary;
  };

  return (
    <main className="page-shell">
      <section className="landing">
        <h1 className="landing-title">LinkedIn Post Generator</h1>

        <div className="voice-row">
          <button
            className={`voice-btn${voice === "founder" ? " active" : ""}`}
            onClick={() => setVoice("founder")}
            type="button"
          >
            Founder Voice
          </button>
          <button
            className={`voice-btn${voice === "company" ? " active" : ""}`}
            onClick={() => setVoice("company")}
            type="button"
          >
            Company Voice
          </button>
        </div>

        <button
          className="generate-btn"
          disabled={loading || isPending}
          onClick={handleGenerate}
          type="button"
        >
          {loading || isPending ? "Generating..." : "Generate Posts"}
        </button>
      </section>

      {error ? (
        <section className="panel error-panel">
          <p>{error}</p>
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
