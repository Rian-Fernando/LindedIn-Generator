from datetime import UTC, datetime

from app.core.config import Settings
from app.models.schemas import TrendBrief, TrendItem, VoicePreset
from app.services.generator import GeneratorService


def test_parse_generated_posts_ignores_malformed_tagging_hints():
    generator = GeneratorService(Settings())
    trend = TrendItem(
        id="trend-1",
        title="Visa and Ramp expand automation",
        source="Finextra",
        source_type="rss",
        url="https://example.com/story",
        summary="Story summary",
        relevance_reason="Relevant",
        published_at=datetime.now(UTC),
        tags=["Automation"],
        score=8.0,
        fingerprint="abc123",
    )
    brief = TrendBrief(
        generated_at=datetime.now(UTC),
        items=[trend],
        total_fetched=1,
        fresh_count=1,
        unique_count=1,
        source_breakdown={"rss": 1},
    )

    posts = generator._parse_generated_posts(
        {
            "posts": [
                {
                    "trend_id": "trend-1",
                    "hook": "Fintech teams are automating the wrong layer.",
                    "hook_type": "contrarian",
                    "body": "Most cycle time is still trapped in approvals, not data entry.",
                    "format": "mid",
                    "hashtags": "#Fintech, #Automation",
                    "tagging_hints": ["Visa", {"entity": "Ramp", "entity_type": "company", "reason": "Mentioned in source"}],
                    "source_ids": "trend-1",
                }
            ]
        },
        VoicePreset.FOUNDER,
        {trend.id: trend for trend in brief.items},
    )

    assert len(posts) == 1
    assert posts[0].hashtags == ["#Fintech", "#Automation"]
    assert len(posts[0].tagging_hints) == 1
    assert posts[0].tagging_hints[0].entity == "Ramp"
