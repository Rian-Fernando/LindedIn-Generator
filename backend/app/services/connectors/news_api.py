from __future__ import annotations

import hashlib
from datetime import datetime

import httpx

from app.core.config import Settings
from app.models.schemas import TrendItem


class NewsAPIConnector:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def fetch(self, client: httpx.AsyncClient) -> list[TrendItem]:
        if not self.settings.news_api_key:
            return []

        response = await client.get(
            self.settings.news_api_base_url,
            headers={"X-Api-Key": self.settings.news_api_key},
            params={
                "q": self.settings.news_api_query,
                "searchIn": "title,description",
                "language": "en",
                "sortBy": "publishedAt",
                "pageSize": self.settings.source_limit,
            },
            timeout=self.settings.request_timeout_seconds,
        )
        payload = response.json()
        results: list[TrendItem] = []
        for article in payload.get("articles", []):
            title = article.get("title")
            url = article.get("url")
            if not title or not url:
                continue
            published_at = article.get("publishedAt")
            results.append(
                TrendItem(
                    id=hashlib.sha1(url.encode()).hexdigest()[:16],
                    title=title,
                    source=(article.get("source") or {}).get("name", "News API"),
                    source_type="news_api",
                    url=url,
                    summary=article.get("description") or "",
                    published_at=datetime.fromisoformat(published_at.replace("Z", "+00:00"))
                    if published_at
                    else None,
                    fingerprint=hashlib.sha1(f"news:{title.lower()}".encode()).hexdigest(),
                )
            )
        return results
