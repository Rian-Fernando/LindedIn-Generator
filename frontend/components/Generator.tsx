"use client";

import { useState, useTransition } from "react";

import { PostCard } from "./PostCard";
import { generateBatch, submitFeedback } from "../lib/api";
import type { BatchResponse, FeedbackPayload, VoicePreset } from "../lib/types";

export function Generator() {
  const [voice, setVoice] = useState<VoicePreset>("founder");
  const [batch, setBatch] = useState<BatchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const busy = loading || isPending;

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
        current ? { ...current, feedback_summary: response.feedback_summary } : current
      );
    });
    return response.feedback_summary;
  };

  return (
    <>
      <div className="voice-row" role="group" aria-label="Brand voice preset">
        <button
          aria-pressed={voice === "founder"}
          className={`voice-btn${voice === "founder" ? " active" : ""}`}
          onClick={() => setVoice("founder")}
          type="button"
        >
          Founder Voice
        </button>
        <button
          aria-pressed={voice === "company"}
          className={`voice-btn${voice === "company" ? " active" : ""}`}
          onClick={() => setVoice("company")}
          type="button"
        >
          Company Voice
        </button>
      </div>

      <button
        className="generate-btn"
        disabled={busy}
        onClick={handleGenerate}
        type="button"
      >
        {busy ? "Generating..." : "Generate Posts"}
      </button>

      <p aria-live="polite" className="generator-status">
        {busy ? "Your posts are being generated. This may take a moment..." : ""}
      </p>

      {error ? (
        <div className="panel error-panel" role="alert">
          <p>{error}</p>
        </div>
      ) : null}

      {batch && !busy ? (
        <div className="posts-grid">
          {batch.posts.map((post) => (
            <PostCard key={post.id} onSubmitFeedback={handleFeedback} post={post} />
          ))}
        </div>
      ) : null}
    </>
  );
}
