from __future__ import annotations

from datetime import UTC, datetime

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.models.schemas import BatchRequest, BatchResponse, FeedbackRequest, FeedbackResponse
from app.services.feedback import summarize_feedback
from app.services.generator import GeneratorService
from app.services.linting import lint_post
from app.services.similarity import SimilarityChecker
from app.services.storage import StorageService
from app.services.style_guide import StyleGuideService
from app.services.tagging import infer_tagging_hints
from app.services.trends import TrendService


settings = get_settings()
storage = StorageService(settings)
style_service = StyleGuideService(settings)
trend_service = TrendService(settings, storage)
generator_service = GeneratorService(settings)

app = FastAPI(title=settings.app_name, version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict:
    ai_status = generator_service.provider_status()
    db_status = storage.status()
    return {
        "status": "ok",
        "timestamp": datetime.now(UTC).isoformat(),
        "environment": settings.environment,
        "ai": ai_status,
        "database": db_status,
    }


@app.get("/api/system/status")
async def system_status() -> dict:
    ai_status = generator_service.provider_status()
    db_status = storage.status()
    missing: list[str] = []
    if not ai_status["configured"]:
        missing.append("AI provider is not fully configured.")
    if not db_status["supabase_ready"]:
        missing.append(db_status["supabase_error"] or "Supabase is not connected.")

    return {
        "timestamp": datetime.now(UTC).isoformat(),
        "ai": ai_status,
        "database": db_status,
        "live_sources": {
            "reddit_subreddits": settings.reddit_subreddit_list,
            "rss_feed_count": len(settings.rss_feeds),
            "news_api_configured": bool(settings.news_api_key),
        },
        "generation_ready": ai_status["configured"] and db_status["supabase_ready"],
        "missing": missing,
    }


@app.get("/api/style-guide")
async def get_style_guide():
    return style_service.get_style_bundle()


@app.get("/api/trends/brief")
async def get_trend_brief():
    brief = await trend_service.fetch_trend_brief()
    if not brief.items:
        raise HTTPException(status_code=503, detail="No live trend items available.")
    return brief


@app.post("/api/generate-batch", response_model=BatchResponse)
async def generate_batch(payload: BatchRequest) -> BatchResponse:
    system_status_payload = await system_status()
    if not system_status_payload["ai"]["configured"]:
        raise HTTPException(status_code=503, detail=system_status_payload["missing"][0])
    if not system_status_payload["database"]["supabase_ready"]:
        raise HTTPException(status_code=503, detail=system_status_payload["database"]["supabase_error"])

    historical_posts = storage.list_recent_generated_posts()
    recent_trend_ids = {row.get("trend_id") for row in historical_posts if row.get("trend_id")}

    trend_brief = await trend_service.fetch_trend_brief(desired_count=max(30, payload.count * 6))
    candidate_items = trend_brief.items
    if recent_trend_ids:
        rotation_candidates = [item for item in trend_brief.items if item.id not in recent_trend_ids]
        if len(rotation_candidates) >= payload.count:
            candidate_items = rotation_candidates
    trend_brief = trend_brief.model_copy(update={"items": candidate_items[:10]})
    if len(trend_brief.items) < payload.count:
        raise HTTPException(status_code=503, detail="Not enough live trends to generate a batch.")

    style_bundle = style_service.get_style_bundle()
    style_context = style_service.build_generation_context(payload.voice)
    feedback_examples = storage.list_feedback_examples()
    feedback_summary = summarize_feedback(feedback_examples)

    try:
        drafts = generator_service.generate(
            trend_brief=trend_brief,
            voice=payload.voice,
            feedback_summary=feedback_summary,
            style_context=style_context,
            count=payload.count,
            historical_posts=historical_posts,
        )
    except (RuntimeError, ValueError) as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    similarity_checker = SimilarityChecker(
        corpus_entries=style_bundle.research_corpus,
        historical_posts=historical_posts,
    )

    source_map = {item.id: item for item in trend_brief.items}
    final_posts = []
    for draft in drafts[: payload.count]:
        related_sources = [source_map[source_id] for source_id in draft.source_ids if source_id in source_map]
        if not related_sources:
            related_sources = [source_map[draft.trend_id]]
        if not draft.tagging_hints:
            draft.tagging_hints = infer_tagging_hints(draft.body, related_sources)
        draft.sources = related_sources
        draft.lint = lint_post(draft.hook, draft.body, draft.hashtags, draft.tagging_hints)
        draft.similarity = similarity_checker.score_text(f"{draft.hook}\n{draft.body}")
        final_posts.append(draft)

    try:
        batch_id = storage.save_batch(payload.voice, final_posts, feedback_summary)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return BatchResponse(
        batch_id=batch_id,
        voice=payload.voice,
        generated_at=datetime.now(UTC),
        trend_brief=trend_brief,
        posts=final_posts,
        feedback_summary=feedback_summary,
        style_summary=style_bundle.pattern_summary,
    )


@app.post("/api/feedback", response_model=FeedbackResponse)
async def record_feedback(payload: FeedbackRequest) -> FeedbackResponse:
    try:
        storage.record_feedback(payload)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    feedback_summary = summarize_feedback(storage.list_feedback_examples())
    return FeedbackResponse(
        post_id=payload.post_id,
        message="Feedback recorded.",
        feedback_summary=feedback_summary,
    )


@app.delete("/api/trends/cleanup")
async def cleanup_trends() -> dict:
    deleted = storage.cleanup_old_trends()
    return {"status": "ok", "deleted": deleted}
