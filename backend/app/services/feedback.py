from __future__ import annotations

from collections import defaultdict


def performance_score(row: dict) -> float:
    return (
        row.get("impressions", 0) / 1000
        + row.get("reactions", 0) * 1.0
        + row.get("comments", 0) * 3.0
        + row.get("reposts", 0) * 5.0
        + row.get("saves", 0) * 4.0
        + row.get("clicks", 0) * 2.0
    )


def summarize_feedback(rows: list[dict]) -> str:
    if not rows:
        return (
            "No historical metrics recorded yet. Prioritize crisp hooks, concrete takeaways, "
            "and posts that connect live trends to real banking workflows."
        )

    by_hook: dict[str, list[float]] = defaultdict(list)
    by_format: dict[str, list[float]] = defaultdict(list)
    by_voice: dict[str, list[float]] = defaultdict(list)
    by_topic: dict[str, list[float]] = defaultdict(list)

    for row in rows:
        score = performance_score(row)
        by_hook[row.get("hook_type", "unknown")].append(score)
        by_format[row.get("format", "unknown")].append(score)
        by_voice[row.get("voice", "unknown")].append(score)
        by_topic[row.get("trend_title", "unknown")].append(score)

    def top_entry(values: dict[str, list[float]]) -> tuple[str, float]:
        ranked = sorted(
            ((key, sum(series) / len(series)) for key, series in values.items() if series),
            key=lambda item: item[1],
            reverse=True,
        )
        return ranked[0] if ranked else ("unknown", 0.0)

    hook, hook_score = top_entry(by_hook)
    fmt, fmt_score = top_entry(by_format)
    voice, voice_score = top_entry(by_voice)
    topic, topic_score = top_entry(by_topic)

    return (
        f"Best recent signal: {voice} voice, {hook} hooks, and {fmt} format posts are leading "
        f"(avg performance index {hook_score:.1f}/{fmt_score:.1f}/{voice_score:.1f}). "
        f"The strongest recent topic was '{topic}'. Lean into what is driving saves, comments, and reposts."
    )
