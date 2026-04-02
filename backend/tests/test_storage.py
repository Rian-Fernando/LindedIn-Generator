from datetime import UTC, datetime
from types import SimpleNamespace

from app.core.config import Settings
from app.models.schemas import GeneratedPost, LintResult, SimilarityResult, TrendItem, VoicePreset
from app.services.storage import StorageService


class ProbeStorageService(StorageService):
    def __init__(self) -> None:
        super().__init__(
            Settings(
                supabase_url="https://example.supabase.co",
                supabase_key="sb_secret_test_key",
            )
        )
        self.calls: list[tuple[str, str]] = []

    def _request(self, method: str, table: str, *, params=None, json_body=None, prefer=None):
        self.calls.append((table, (params or {}).get("select", "")))
        return SimpleNamespace(status_code=200, json=lambda: [], text="ok")


def test_supabase_probe_uses_schema_specific_columns():
    storage = ProbeStorageService()

    ready, error = storage._probe_supabase()

    assert ready is True
    assert error is None
    assert storage.calls == [
        ("trend_events", "id"),
        ("generation_batches", "id"),
        ("generated_posts", "id"),
        ("post_feedback", "post_id"),
    ]


def test_serialize_post_record_matches_database_columns():
    storage = ProbeStorageService()
    post = GeneratedPost(
        id="post-1",
        trend_id="trend-1",
        trend_title="Visa expands dispute automation",
        voice=VoicePreset.FOUNDER,
        hook="The real cost center is not the model. It is the exception queue.",
        hook_type="contrarian",
        body="Banks win when they remove review loops before they add more AI layers.",
        format="mid",
        hashtags=["#Fintech", "#Automation"],
        source_ids=["trend-1"],
        sources=[
            TrendItem(
                id="trend-1",
                title="Visa expands dispute automation",
                source="Finextra",
                source_type="rss",
                url="https://example.com/story",
                summary="Summary",
                relevance_reason="Relevant",
                published_at=datetime.now(UTC),
                tags=["Automation"],
                score=7.8,
                fingerprint="abc",
            )
        ],
        lint=LintResult(score=90, flags=[]),
        similarity=SimilarityResult(max_score=12, status="clear", matches=[]),
    )

    record = storage._serialize_post_record(post, "batch-1")

    assert record["batch_id"] == "batch-1"
    assert record["voice"] == "founder"
    assert "sources" not in record
