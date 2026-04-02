from __future__ import annotations

import hashlib
from datetime import UTC, datetime

import httpx

from app.core.config import Settings
from app.models.schemas import TrendItem


class RedditConnector:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def fetch(self, client: httpx.AsyncClient) -> list[TrendItem]:
        results: list[TrendItem] = []
        headers = {"User-Agent": self.settings.reddit_user_agent}

        for subreddit in self.settings.reddit_subreddit_list[:5]:
            response = await client.get(
                f"https://www.reddit.com/r/{subreddit}/hot.json?limit=8",
                headers=headers,
                timeout=self.settings.request_timeout_seconds,
            )
            payload = response.json()
            posts = payload.get("data", {}).get("children", [])
            for post in posts[:4]:
                data = post.get("data", {})
                title = data.get("title")
                permalink = data.get("permalink")
                if not title or not permalink:
                    continue
                results.append(
                    TrendItem(
                        id=f"reddit-{data.get('id')}",
                        title=title,
                        source=f"r/{subreddit}",
                        source_type="reddit",
                        url=f"https://www.reddit.com{permalink}",
                        summary=data.get("selftext", "")[:280],
                        published_at=datetime.fromtimestamp(data.get("created_utc", 0), UTC),
                        fingerprint=hashlib.sha1(f"reddit:{title.lower()}".encode()).hexdigest(),
                    )
                )
        return results
