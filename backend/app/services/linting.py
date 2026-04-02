from __future__ import annotations

import re

from app.models.schemas import LintResult, TaggingHint


WEAK_HOOK_RE = re.compile(r"^\s*(i\b|in my experience\b|as a\b)", re.IGNORECASE)
VAGUE_RE = re.compile(
    r"\b(very|amazing|incredible|game-changing|revolutionary|cutting-edge|best-in-class)\b",
    re.IGNORECASE,
)
FLUFF_RE = re.compile(
    r"\b(a lot of|many companies|everyone knows|the future is here|huge opportunity)\b",
    re.IGNORECASE,
)
METRIC_RE = re.compile(
    r"(\$[\d,.]+|\b\d+(?:\.\d+)?%|\b\d+\s?(?:days?|weeks?|months?|quarters?|hours?)\b|\b20\d{2}\b)"
)
CREDIBILITY_RE = re.compile(
    r"\b(according to|research shows|data from|case study|survey finds|"
    r"SEC|OCC|CFPB|Basel|FDIC|FINRA|Federal Reserve|"
    r"McKinsey|Deloitte|Accenture|PwC|EY|KPMG|Gartner|Forrester|CB Insights|"
    r"Reuters|Bloomberg|S&P|Moody's)\b",
    re.IGNORECASE,
)
CTA_RE = re.compile(r"\b(feel free to|hope this helps|reach out if|like and share|follow for more)\b", re.I)
CORPORATE_CLOSE_RE = re.compile(r"\b(in conclusion|to summarize|in closing)\b", re.I)


def lint_post(
    hook: str,
    body: str,
    hashtags: list[str],
    tagging_hints: list[TaggingHint],
) -> LintResult:
    flags: list[str] = []
    score = 100

    if WEAK_HOOK_RE.search(hook):
        flags.append("Weak hook")
        score -= 18

    if VAGUE_RE.search(f"{hook}\n{body}"):
        flags.append("Vague claims")
        score -= 14

    if FLUFF_RE.search(body):
        flags.append("Generic/fluffy content")
        score -= 12

    if not METRIC_RE.search(body) and not CREDIBILITY_RE.search(body):
        flags.append("Missing credibility")
        score -= 10

    paragraphs = [part.strip() for part in body.split("\n\n") if part.strip()]
    if len(paragraphs) < 3 or any(len(p.split()) > 65 for p in paragraphs):
        flags.append("Poor readability")
        score -= 14

    if len(hashtags) > 5:
        flags.append("Hashtag spam")
        score -= 12

    if CTA_RE.search(body):
        flags.append("Filler CTA")
        score -= 10

    if CORPORATE_CLOSE_RE.search(body):
        flags.append("Corporate close")
        score -= 10

    if len(tagging_hints) > 2:
        flags.append("Too many tags")
        score -= 8

    return LintResult(score=max(score, 0), flags=flags)
