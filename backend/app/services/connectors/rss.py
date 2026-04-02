from __future__ import annotations

import hashlib
import re
from datetime import datetime

import feedparser
import httpx

_HTML_TAG_RE = re.compile(r"<[^>]+>")

from app.core.config import Settings
from app.models.schemas import TrendItem


class RSSConnector:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def fetch(self, client: httpx.AsyncClient) -> list[TrendItem]:
        results: list[TrendItem] = []
        for feed in self.settings.rss_feeds:
            response = await client.get(feed["url"], timeout=self.settings.request_timeout_seconds)
            parsed = feedparser.parse(response.text)
            for entry in parsed.entries[:6]:
                title = entry.get("title")
                link = entry.get("link")
                if not title or not link:
                    continue
                published = entry.get("published_parsed")
                published_at = None
                if published:
                    published_at = datetime(*published[:6])
                results.append(
                    TrendItem(
                        id=hashlib.sha1(link.encode()).hexdigest()[:16],
                        title=title,
                        source=feed.get("name", "RSS Feed"),
                        source_type=feed.get("source_type", "rss"),
                        url=link,
                        summary=_HTML_TAG_RE.sub("", (entry.get("summary") or "")).strip()[:280],
                        published_at=published_at,
                        fingerprint=hashlib.sha1(f"rss:{title.lower()}".encode()).hexdigest(),
                    )
                )
        return results
