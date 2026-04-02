from __future__ import annotations

import hashlib
from datetime import UTC, datetime

import httpx

from app.core.config import Settings
from app.models.schemas import TrendItem


class HackerNewsConnector:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.base_url = "https://hacker-news.firebaseio.com/v0"

    async def fetch(self, client: httpx.AsyncClient) -> list[TrendItem]:
        story_ids_response = await client.get(
            f"{self.base_url}/topstories.json",
            timeout=self.settings.request_timeout_seconds,
        )
        story_ids = story_ids_response.json()[: self.settings.source_limit]

        results: list[TrendItem] = []
        for story_id in story_ids:
            item_response = await client.get(
                f"{self.base_url}/item/{story_id}.json",
                timeout=self.settings.request_timeout_seconds,
            )
            item = item_response.json()
            title = item.get("title")
            url = item.get("url")
            if not title or not url:
                continue
            results.append(
                TrendItem(
                    id=f"hn-{story_id}",
                    title=title,
                    source="Hacker News",
                    source_type="hacker_news",
                    url=url,
                    summary=item.get("text", "") or "",
                    published_at=datetime.fromtimestamp(item.get("time", 0), UTC),
                    fingerprint=hashlib.sha1(f"hn:{title.lower()}".encode()).hexdigest(),
                )
            )
        return results
