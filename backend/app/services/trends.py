from __future__ import annotations

import asyncio
from collections import Counter
from datetime import UTC, datetime
from typing import Iterable

import httpx

from app.core.config import Settings
from app.models.schemas import TrendBrief, TrendItem
from app.services.connectors.hacker_news import HackerNewsConnector
from app.services.connectors.news_api import NewsAPIConnector
from app.services.connectors.reddit import RedditConnector
from app.services.connectors.rss import RSSConnector
from app.services.storage import StorageService


KEYWORDS = {
    "fintech": 2.5,
    "bank": 2.0,
    "banking": 2.0,
    "investment": 2.0,
    "deal": 1.8,
    "automation": 2.3,
    "workflow": 1.8,
    "ai": 1.7,
    "agent": 1.5,
    "compliance": 1.7,
    "payments": 1.6,
    "underwriting": 1.8,
    "diligence": 1.8,
    "data": 1.2,
    "fraud": 1.4,
}

# Industry-specific keywords — at least one must match for an item to qualify.
# Generic tech terms (ai, data, agent, workflow, automation) alone are not enough.
INDUSTRY_KEYWORDS = {
    "fintech", "bank", "banking", "investment", "deal", "compliance",
    "payments", "underwriting", "diligence", "fraud", "lending", "trading",
    "capital", "finance", "financial", "regulatory", "regtech",
}


SOURCE_WEIGHT = {
    "news_api": 1.4,
    "rss": 1.2,
    "company_blog": 1.3,
    "changelog": 1.3,
    "hacker_news": 1.1,
    "reddit": 0.95,
}


class TrendService:
    def __init__(self, settings: Settings, storage: StorageService) -> None:
        self.settings = settings
        self.storage = storage
        self.connectors = [
            HackerNewsConnector(settings),
            RedditConnector(settings),
            NewsAPIConnector(settings),
            RSSConnector(settings),
        ]

    def _keyword_score(self, text: str) -> float:
        lowered = text.lower()
        return sum(weight for keyword, weight in KEYWORDS.items() if keyword in lowered)

    @staticmethod
    def _has_industry_relevance(text: str) -> bool:
        lowered = text.lower()
        return any(keyword in lowered for keyword in INDUSTRY_KEYWORDS)

    def _relevance_reason(self, item: TrendItem) -> str:
        title = item.title.lower()
        reasons = []
        if any(keyword in title for keyword in ("automation", "workflow", "ai", "agent")):
            reasons.append("Signals automation workflow change")
        if any(keyword in title for keyword in ("bank", "fintech", "payments", "investment")):
            reasons.append("Directly relevant to finance and fintech operators")
        if any(keyword in title for keyword in ("compliance", "fraud", "underwriting", "diligence")):
            reasons.append("Touches controlled banking workflows")
        return "; ".join(reasons[:2]) or "Relevant to investment banking and fintech automation"

    def _derive_tags(self, item: TrendItem) -> list[str]:
        candidates = [
            "Fintech" if "fintech" in item.title.lower() else "",
            "Automation" if "automation" in item.title.lower() or "agent" in item.title.lower() else "",
            "Banking" if "bank" in item.title.lower() or "investment" in item.title.lower() else "",
        ]
        return [tag for tag in candidates if tag]

    def _score_item(self, item: TrendItem) -> float:
        source_weight = SOURCE_WEIGHT.get(item.source_type, 1.0)
        freshness_bonus = 0.0
        if item.published_at:
            item_time = item.published_at
            if item_time.tzinfo is None:
                item_time = item_time.replace(tzinfo=UTC)
            age_hours = max((datetime.now(UTC) - item_time).total_seconds() / 3600, 0)
            freshness_bonus = max(0.0, 24 - min(age_hours, 24)) / 12
        return round(self._keyword_score(f"{item.title} {item.summary}") * source_weight + freshness_bonus, 2)

    def _deduplicate(self, items: Iterable[TrendItem]) -> list[TrendItem]:
        by_fingerprint: dict[str, TrendItem] = {}
        for item in items:
            item.relevance_reason = self._relevance_reason(item)
            item.tags = self._derive_tags(item)
            item.score = self._score_item(item)
            current = by_fingerprint.get(item.fingerprint)
            if current is None or item.score > current.score:
                by_fingerprint[item.fingerprint] = item
        return sorted(by_fingerprint.values(), key=lambda item: item.score, reverse=True)

    async def fetch_trend_brief(self, desired_count: int | None = None) -> TrendBrief:
        desired = desired_count or self.settings.trend_brief_size
        async with httpx.AsyncClient() as client:
            results = await asyncio.gather(
                *(connector.fetch(client) for connector in self.connectors),
                return_exceptions=True,
            )

        merged: list[TrendItem] = []
        source_counter: Counter[str] = Counter()
        for result in results:
            if isinstance(result, Exception):
                continue
            merged.extend(result)
            for item in result:
                source_counter[item.source_type] += 1

        ranked = self._deduplicate(merged)
        # Require at least one finance/fintech keyword — generic tech terms alone (ai, data) are not enough
        ranked = [
            item for item in ranked
            if self._keyword_score(f"{item.title} {item.summary}") > 0
            and self._has_industry_relevance(f"{item.title} {item.summary}")
        ]
        fresh = self.storage.store_trends(ranked)
        selected = (fresh[:desired] if fresh else ranked[:desired])[:desired]

        return TrendBrief(
            generated_at=datetime.now(UTC),
            items=selected,
            total_fetched=len(merged),
            fresh_count=len(fresh),
            unique_count=len(ranked),
            source_breakdown=dict(source_counter),
        )
