from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


class VoicePreset(str, Enum):
    FOUNDER = "founder"
    COMPANY = "company"


class TrendItem(BaseModel):
    id: str
    title: str
    source: str
    source_type: str
    url: str
    summary: str = ""
    relevance_reason: str = ""
    published_at: datetime | None = None
    tags: list[str] = Field(default_factory=list)
    score: float = 0.0
    fingerprint: str = ""


class TrendBrief(BaseModel):
    generated_at: datetime
    items: list[TrendItem]
    total_fetched: int
    fresh_count: int
    unique_count: int
    source_breakdown: dict[str, int] = Field(default_factory=dict)


class TaggingHint(BaseModel):
    entity: str
    entity_type: Literal["company", "person"]
    reason: str


class LintResult(BaseModel):
    score: int
    flags: list[str] = Field(default_factory=list)


class SimilarityMatch(BaseModel):
    source_id: str
    label: str
    score: float
    source_type: str


class SimilarityResult(BaseModel):
    max_score: float
    status: Literal["clear", "review", "blocked"]
    matches: list[SimilarityMatch] = Field(default_factory=list)


class GeneratedPost(BaseModel):
    id: str
    trend_id: str
    trend_title: str
    voice: VoicePreset
    hook: str
    hook_type: str
    body: str
    format: Literal["short", "mid", "long"]
    hashtags: list[str] = Field(default_factory=list)
    tagging_hints: list[TaggingHint] = Field(default_factory=list)
    source_ids: list[str] = Field(default_factory=list)
    sources: list[TrendItem] = Field(default_factory=list)
    lint: LintResult = Field(default_factory=lambda: LintResult(score=0, flags=[]))
    similarity: SimilarityResult = Field(
        default_factory=lambda: SimilarityResult(max_score=0, status="clear", matches=[])
    )


class StyleGuideResponse(BaseModel):
    style_guide: str
    voice_guides: dict[str, str]
    research_corpus: list[dict]
    pattern_summary: dict[str, list[str]]


class BatchRequest(BaseModel):
    voice: VoicePreset = VoicePreset.FOUNDER
    count: int = Field(default=5, ge=5, le=5)


class BatchResponse(BaseModel):
    batch_id: str
    voice: VoicePreset
    generated_at: datetime
    trend_brief: TrendBrief
    posts: list[GeneratedPost]
    feedback_summary: str
    style_summary: dict[str, list[str]]


class FeedbackRequest(BaseModel):
    post_id: str
    impressions: int = Field(default=0, ge=0)
    reactions: int = Field(default=0, ge=0)
    comments: int = Field(default=0, ge=0)
    reposts: int = Field(default=0, ge=0)
    saves: int = Field(default=0, ge=0)
    clicks: int = Field(default=0, ge=0)
    notes: str | None = None


class FeedbackResponse(BaseModel):
    post_id: str
    message: str
    feedback_summary: str
