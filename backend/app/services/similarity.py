from __future__ import annotations

import math
import re
from collections import Counter

from app.models.schemas import SimilarityMatch, SimilarityResult


TOKEN_RE = re.compile(r"[a-z0-9]+")


def normalize_text(value: str) -> str:
    return " ".join(TOKEN_RE.findall(value.lower()))


def tokenize(value: str) -> list[str]:
    return normalize_text(value).split()


def shingles(tokens: list[str], size: int = 3) -> set[str]:
    if len(tokens) < size:
        return {" ".join(tokens)} if tokens else set()
    return {" ".join(tokens[index : index + size]) for index in range(len(tokens) - size + 1)}


def cosine_similarity(left: Counter[str], right: Counter[str]) -> float:
    intersection = set(left) & set(right)
    numerator = sum(left[token] * right[token] for token in intersection)
    left_norm = math.sqrt(sum(value * value for value in left.values()))
    right_norm = math.sqrt(sum(value * value for value in right.values()))
    if not left_norm or not right_norm:
        return 0.0
    return numerator / (left_norm * right_norm)


class SimilarityChecker:
    def __init__(self, corpus_entries: list[dict], historical_posts: list[dict] | None = None) -> None:
        self.references = list(corpus_entries)
        self.references.extend(historical_posts or [])

    def score_text(self, text: str) -> SimilarityResult:
        tokens = tokenize(text)
        token_counts = Counter(tokens)
        token_set = set(tokens)
        text_shingles = shingles(tokens)

        matches: list[SimilarityMatch] = []
        max_score = 0.0

        for reference in self.references:
            label = reference.get("creator") or reference.get("label") or reference.get("id", "reference")
            ref_text = " ".join(
                [
                    reference.get("reference_summary", ""),
                    reference.get("pattern_note", ""),
                    reference.get("hook", ""),
                    reference.get("body", ""),
                ]
            )
            ref_tokens = tokenize(ref_text)
            ref_counts = Counter(ref_tokens)
            ref_token_set = set(ref_tokens)
            ref_shingles = shingles(ref_tokens)

            token_overlap = len(token_set & ref_token_set) / max(len(token_set | ref_token_set), 1)
            shingle_overlap = len(text_shingles & ref_shingles) / max(len(text_shingles | ref_shingles), 1)
            cosine = cosine_similarity(token_counts, ref_counts)
            score = round((token_overlap * 0.35 + shingle_overlap * 0.4 + cosine * 0.25) * 100, 2)

            if score <= 0:
                continue

            matches.append(
                SimilarityMatch(
                    source_id=reference.get("id", label.lower().replace(" ", "-")),
                    label=label,
                    score=score,
                    source_type=reference.get("source_type", "reference"),
                )
            )
            max_score = max(max_score, score)

        matches.sort(key=lambda item: item.score, reverse=True)

        status = "clear"
        if max_score >= 45:
            status = "blocked"
        elif max_score >= 25:
            status = "review"

        return SimilarityResult(max_score=max_score, status=status, matches=matches[:3])
