from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


ROOT_DIR = Path(__file__).resolve().parents[3]


DEFAULT_RSS_FEEDS = [
    {
        "name": "Finextra",
        "url": "https://www.finextra.com/rss/headlines.aspx",
        "source_type": "rss",
    },
    {
        "name": "PYMNTS",
        "url": "https://www.pymnts.com/feed/",
        "source_type": "rss",
    },
    {
        "name": "TechCrunch Fintech",
        "url": "https://techcrunch.com/category/fintech/feed/",
        "source_type": "rss",
    },
]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "LinkedIn Post Generation Workflow"
    environment: str = "development"
    frontend_url: str = "http://localhost:3000"

    supabase_url: str | None = None
    supabase_key: str | None = None

    openai_api_key: str | None = None
    openai_model: str | None = None

    news_api_key: str | None = None
    news_api_base_url: str = "https://newsapi.org/v2/everything"
    news_api_query: str = (
        '("fintech automation" OR "investment banking automation" '
        'OR "banking AI" OR "deal workflow software")'
    )

    reddit_client_id: str | None = None
    reddit_client_secret: str | None = None
    reddit_user_agent: str = "linkedin-post-generator/1.0"
    reddit_subreddits: str = "fintech,banking,investing,startups,MachineLearning"

    rss_feeds_json: str = Field(default_factory=lambda: json.dumps(DEFAULT_RSS_FEEDS))

    trend_ttl_hours: int = 72
    trend_brief_size: int = 8
    post_batch_size: int = 5
    source_limit: int = 20
    request_timeout_seconds: float = 12.0
    local_store_path: Path = ROOT_DIR / "database" / "local_dev_store.json"
    allow_local_dev_fallback: bool = False

    prompts_dir: Path = ROOT_DIR / "prompts"
    style_guide_path: Path = ROOT_DIR / "prompts" / "style_guide.md"
    founder_voice_path: Path = ROOT_DIR / "prompts" / "founder_voice.md"
    company_voice_path: Path = ROOT_DIR / "prompts" / "company_voice.md"
    generation_prompt_path: Path = ROOT_DIR / "prompts" / "generation_prompt.md"
    influencer_corpus_path: Path = ROOT_DIR / "database" / "influencer_corpus.json"

    @property
    def rss_feeds(self) -> list[dict[str, str]]:
        try:
            loaded = json.loads(self.rss_feeds_json)
            return [feed for feed in loaded if feed.get("url")]
        except json.JSONDecodeError:
            return DEFAULT_RSS_FEEDS

    @property
    def reddit_subreddit_list(self) -> list[str]:
        return [part.strip() for part in self.reddit_subreddits.split(",") if part.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
