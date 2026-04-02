"use client";

import { useState } from "react";

import type { FeedbackPayload, GeneratedPost } from "../lib/types";

interface PostCardProps {
  post: GeneratedPost;
  onSubmitFeedback: (payload: FeedbackPayload) => Promise<string>;
}

function similarityTone(status: GeneratedPost["similarity"]["status"]) {
  if (status === "blocked") {
    return "danger";
  }
  if (status === "review") {
    return "warn";
  }
  return "ok";
}

export function PostCard({ post, onSubmitFeedback }: PostCardProps) {
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({
    impressions: 0,
    reactions: 0,
    comments: 0,
    reposts: 0,
    saves: 0,
    clicks: 0,
    notes: ""
  });

  const copyPost = async () => {
    const output = [post.hook, "", post.body, "", post.hashtags.join(" ")].join("\n").trim();
    await navigator.clipboard.writeText(output);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFeedbackMessage(null);
    try {
      const summary = await onSubmitFeedback({
        post_id: post.id,
        impressions: metrics.impressions,
        reactions: metrics.reactions,
        comments: metrics.comments,
        reposts: metrics.reposts,
        saves: metrics.saves,
        clicks: metrics.clicks,
        notes: metrics.notes || undefined
      });
      setFeedbackMessage(summary);
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="post-card">
      <div className="post-card-head">
        <div className="post-head-copy">
          <div className="post-topline">
            <span className="badge">{post.format} form</span>
            <span className="badge badge-secondary">{post.hook_type}</span>
          </div>
          <h3>{post.trend_title}</h3>
        </div>
        <button className="copy-button" onClick={copyPost} type="button">
          {copied ? "Copied" : "Copy Post"}
        </button>
      </div>

      <div className="post-hook">{post.hook}</div>

      <div className="post-body">
        {post.body.split("\n\n").map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      <div className="chip-row">
        {post.hashtags.map((tag) => (
          <span className="chip" key={tag}>
            {tag}
          </span>
        ))}
      </div>

      <div className="post-meta-row">
        <div className="score-pill">
          <strong>{post.lint.score}</strong>
          <span>Lint score</span>
        </div>
        <div className={`score-pill ${similarityTone(post.similarity.status)}`}>
          <strong>{post.similarity.max_score.toFixed(0)}%</strong>
          <span>{post.similarity.status} similarity</span>
        </div>
      </div>

      <div className="post-section">
        <p className="section-label">Lint feedback</p>
        <div className="chip-row">
          {post.lint.flags.length ? (
            post.lint.flags.map((flag) => (
              <span className="chip chip-warn" key={flag}>
                {flag}
              </span>
            ))
          ) : (
            <span className="chip chip-ok">No lint flags</span>
          )}
        </div>
      </div>

      <div className="post-section">
        <p className="section-label">Tagging hints</p>
        <div className="chip-row">
          {post.tagging_hints.length ? (
            post.tagging_hints.map((hint) => (
              <span className="chip" key={hint.entity}>
                {hint.entity} ({hint.entity_type})
              </span>
            ))
          ) : (
            <span className="chip">No natural tag opportunity</span>
          )}
        </div>
        {post.tagging_hints.length ? (
          <div className="hint-list">
            {post.tagging_hints.map((hint) => (
              <p key={`${hint.entity}-reason`} className="muted">
                {hint.entity}: {hint.reason}
              </p>
            ))}
          </div>
        ) : null}
      </div>

      <div className="post-section">
        <p className="section-label">Source grounding</p>
        <div className="source-links">
          {post.sources.map((source) => (
            <a href={source.url} key={source.id} rel="noreferrer" target="_blank">
              {source.source}: {source.title}
            </a>
          ))}
        </div>
      </div>

      <div className="post-section">
        <p className="section-label">Similarity matches</p>
        <div className="hint-list">
          {post.similarity.matches.length ? (
            post.similarity.matches.map((match) => (
              <p className="muted" key={match.source_id}>
                {match.label} ({match.source_type}) {match.score.toFixed(0)}%
              </p>
            ))
          ) : (
            <p className="muted">No significant overlap against the research corpus or prior generated posts.</p>
          )}
        </div>
      </div>

      <form className="feedback-form" onSubmit={handleSubmit}>
        <div className="feedback-grid">
          {[
            ["impressions", "Impr."],
            ["reactions", "Reacts"],
            ["comments", "Comments"],
            ["reposts", "Reposts"],
            ["saves", "Saves"],
            ["clicks", "Clicks"]
          ].map(([field, label]) => (
            <label key={field}>
              <span>{label}</span>
              <input
                min={0}
                onChange={(event) =>
                  setMetrics((current) => ({
                    ...current,
                    [field]: Number(event.target.value || 0)
                  }))
                }
                type="number"
                value={metrics[field as keyof typeof metrics] as number}
              />
            </label>
          ))}
        </div>

        <label className="notes-field">
          <span>Notes</span>
          <textarea
            onChange={(event) =>
              setMetrics((current) => ({ ...current, notes: event.target.value }))
            }
            placeholder="Optional notes about what landed or what missed."
            value={metrics.notes}
          />
        </label>

        <div className="feedback-actions">
          <button className="secondary-button" disabled={saving} type="submit">
            {saving ? "Saving..." : "Save Metrics"}
          </button>
          {feedbackMessage ? <p className="muted compact">{feedbackMessage}</p> : null}
        </div>
      </form>
    </article>
  );
}
