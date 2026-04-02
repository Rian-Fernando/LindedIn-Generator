from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import uuid4

import httpx

from app.core.config import Settings
from app.models.schemas import FeedbackRequest, GeneratedPost, TrendItem, VoicePreset


def _to_jsonable(value):
    if hasattr(value, "model_dump"):
        return value.model_dump(mode="json")
    if isinstance(value, list):
        return [_to_jsonable(item) for item in value]
    if isinstance(value, dict):
        return {key: _to_jsonable(item) for key, item in value.items()}
    return value


class StorageService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.local_path: Path = settings.local_store_path
        self.local_path.parent.mkdir(parents=True, exist_ok=True)
        self.mode = "disabled"
        self.supabase_key_type = self._detect_supabase_key_type(settings.supabase_key)
        self.supabase_init_error: str | None = None
        self.rest_url = ""
        self.rest_headers: dict[str, str] = {}

        if settings.supabase_url and settings.supabase_key:
            self.rest_url = settings.supabase_url.rstrip("/") + "/rest/v1"
            self.rest_headers = {
                "apikey": settings.supabase_key,
                "Content-Type": "application/json",
            }
            self.mode = "supabase_rest"
        elif settings.allow_local_dev_fallback:
            self.mode = "local"

    def _detect_supabase_key_type(self, key: str | None) -> str | None:
        if not key:
            return None
        if key.startswith("sb_publishable_"):
            return "publishable"
        if key.startswith("sb_secret_") or key.startswith("service_role"):
            return "service_role"
        return "unknown"

    @property
    def persistence_enabled(self) -> bool:
        return self.mode in {"supabase_rest", "local"}

    def _request(
        self,
        method: str,
        table: str,
        *,
        params: dict[str, str] | None = None,
        json_body=None,
        prefer: str | None = None,
    ) -> httpx.Response:
        if self.mode != "supabase_rest" or not self.rest_url:
            raise RuntimeError("Supabase REST is not configured.")

        headers = dict(self.rest_headers)
        if prefer:
            headers["Prefer"] = prefer

        response = httpx.request(
            method,
            f"{self.rest_url}/{table}",
            headers=headers,
            params=params,
            json=_to_jsonable(json_body),
            timeout=20.0,
        )
        return response

    def status(self) -> dict:
        ready, error = self._probe_supabase()
        return {
            "mode": self.mode,
            "supabase_connected": self.mode == "supabase_rest",
            "supabase_ready": ready,
            "supabase_key_type": self.supabase_key_type,
            "supabase_error": error,
            "local_fallback_enabled": self.mode == "local",
            "local_store_path": str(self.local_path),
            "local_store_exists": self.local_path.exists(),
        }

    def _probe_supabase(self) -> tuple[bool, str | None]:
        if self.mode != "supabase_rest":
            return False, self.supabase_init_error or "Supabase client is not configured."
        if self.supabase_key_type == "publishable":
            return (
                False,
                "Publishable Supabase key provided. This backend requires a server-side secret/service-role key for writes.",
            )

        probe_columns = {
            "trend_events": "id",
            "generation_batches": "id",
            "generated_posts": "id",
            "post_feedback": "post_id",
        }
        for table, column in probe_columns.items():
            response = self._request("GET", table, params={"select": column, "limit": "1"})
            if response.status_code >= 400:
                try:
                    payload = response.json()
                    message = payload.get("message") or response.text
                except Exception:
                    message = response.text
                return False, message
        return True, None

    def _load_state(self) -> dict:
        if not self.local_path.exists():
            return {"trends": [], "batches": [], "posts": [], "feedback": []}
        return json.loads(self.local_path.read_text(encoding="utf-8"))

    def _save_state(self, state: dict) -> None:
        self.local_path.write_text(json.dumps(state, indent=2), encoding="utf-8")

    def _serialize_post_record(self, post: GeneratedPost, batch_id: str) -> dict:
        return {
            "id": post.id,
            "batch_id": batch_id,
            "trend_id": post.trend_id,
            "trend_title": post.trend_title,
            "voice": post.voice.value,
            "hook": post.hook,
            "hook_type": post.hook_type,
            "body": post.body,
            "format": post.format,
            "hashtags": _to_jsonable(post.hashtags),
            "tagging_hints": _to_jsonable(post.tagging_hints),
            "source_ids": _to_jsonable(post.source_ids),
            "lint": _to_jsonable(post.lint),
            "similarity": _to_jsonable(post.similarity),
        }

    def store_trends(self, items: list[TrendItem]) -> list[TrendItem]:
        if self.mode == "supabase_rest":
            try:
                return self._store_trends_supabase(items)
            except RuntimeError:
                return items
        if self.mode == "local":
            return self._store_trends_local(items)
        return items

    def _store_trends_local(self, items: list[TrendItem]) -> list[TrendItem]:
        state = self._load_state()
        cutoff = datetime.now(UTC) - timedelta(hours=self.settings.trend_ttl_hours)
        existing = {
            row["fingerprint"]
            for row in state["trends"]
            if datetime.fromisoformat(row["created_at"]) >= cutoff
        }
        fresh = [item for item in items if item.fingerprint not in existing]
        for item in fresh:
            payload = item.model_dump(mode="json")
            payload["created_at"] = datetime.now(UTC).isoformat()
            state["trends"].append(payload)
        self._save_state(state)
        return fresh

    def _store_trends_supabase(self, items: list[TrendItem]) -> list[TrendItem]:
        cutoff = (datetime.now(UTC) - timedelta(hours=self.settings.trend_ttl_hours)).isoformat()
        response = self._request(
            "GET",
            "trend_events",
            params={"select": "fingerprint", "created_at": f"gte.{cutoff}", "limit": "1000"},
        )
        if response.status_code >= 400:
            raise RuntimeError(response.text)
        existing = {row["fingerprint"] for row in response.json()}
        fresh = [item for item in items if item.fingerprint not in existing]
        if fresh:
            insert_response = self._request(
                "POST",
                "trend_events",
                json_body=[item.model_dump(mode="json") for item in fresh],
                prefer="return=representation",
            )
            if insert_response.status_code >= 400:
                raise RuntimeError(insert_response.text)
        return fresh

    def save_batch(
        self,
        voice: VoicePreset,
        posts: list[GeneratedPost],
        feedback_summary: str,
    ) -> str:
        if self.mode == "supabase_rest":
            return self._save_batch_supabase(voice, posts, feedback_summary)
        if self.mode == "local":
            return self._save_batch_local(voice, posts, feedback_summary)
        raise RuntimeError("Database persistence is not configured. Set SUPABASE_URL and SUPABASE_KEY.")

    def _save_batch_local(
        self,
        voice: VoicePreset,
        posts: list[GeneratedPost],
        feedback_summary: str,
    ) -> str:
        state = self._load_state()
        batch_id = str(uuid4())
        state["batches"].append(
            {
                "id": batch_id,
                "voice": voice.value,
                "trend_count": len(posts),
                "feedback_summary": feedback_summary,
                "created_at": datetime.now(UTC).isoformat(),
            }
        )
        for post in posts:
            payload = self._serialize_post_record(post, batch_id)
            payload["created_at"] = datetime.now(UTC).isoformat()
            state["posts"].append(payload)
        self._save_state(state)
        return batch_id

    def _save_batch_supabase(
        self,
        voice: VoicePreset,
        posts: list[GeneratedPost],
        feedback_summary: str,
    ) -> str:
        batch_response = self._request(
            "POST",
            "generation_batches",
            json_body={
                "voice": voice.value,
                "trend_count": len(posts),
                "feedback_summary": feedback_summary,
            },
            prefer="return=representation",
        )
        if batch_response.status_code >= 400:
            raise RuntimeError(batch_response.text)
        batch_id = batch_response.json()[0]["id"]

        posts_response = self._request(
            "POST",
            "generated_posts",
            json_body=[self._serialize_post_record(post, batch_id) for post in posts],
            prefer="return=representation",
        )
        if posts_response.status_code >= 400:
            raise RuntimeError(posts_response.text)
        return batch_id

    def record_feedback(self, payload: FeedbackRequest) -> None:
        if self.mode == "supabase_rest":
            self._record_feedback_supabase(payload)
            return
        if self.mode == "local":
            self._record_feedback_local(payload)
            return
        raise RuntimeError("Database persistence is not configured. Set SUPABASE_URL and SUPABASE_KEY.")

    def _record_feedback_local(self, payload: FeedbackRequest) -> None:
        state = self._load_state()
        rows = [row for row in state["feedback"] if row["post_id"] == payload.post_id]
        data = payload.model_dump(mode="json")
        data["updated_at"] = datetime.now(UTC).isoformat()
        if rows:
            state["feedback"] = [row for row in state["feedback"] if row["post_id"] != payload.post_id]
        state["feedback"].append(data)
        self._save_state(state)

    def _record_feedback_supabase(self, payload: FeedbackRequest) -> None:
        response = self._request(
            "POST",
            "post_feedback",
            params={"on_conflict": "post_id"},
            json_body={
                **payload.model_dump(mode="json"),
                "updated_at": datetime.now(UTC).isoformat(),
            },
            prefer="resolution=merge-duplicates,return=representation",
        )
        if response.status_code >= 400:
            raise RuntimeError(response.text)

    def list_feedback_examples(self) -> list[dict]:
        if self.mode == "supabase_rest":
            return self._list_feedback_examples_supabase()
        if self.mode != "local":
            return []
        state = self._load_state()
        posts = {row["id"]: row for row in state["posts"]}
        merged = []
        for feedback in state["feedback"]:
            post = posts.get(feedback["post_id"])
            if not post:
                continue
            merged.append({**post, **feedback})
        return merged

    def _list_feedback_examples_supabase(self) -> list[dict]:
        feedback_response = self._request("GET", "post_feedback", params={"select": "*", "limit": "1000"})
        posts_response = self._request("GET", "generated_posts", params={"select": "*", "limit": "1000"})
        if feedback_response.status_code >= 400 or posts_response.status_code >= 400:
            return []
        posts = {row["id"]: row for row in posts_response.json()}
        return [
            {**posts[row["post_id"]], **row}
            for row in feedback_response.json()
            if row["post_id"] in posts
        ]

    def list_recent_generated_posts(self, limit: int = 25) -> list[dict]:
        if self.mode == "supabase_rest":
            response = self._request(
                "GET",
                "generated_posts",
                params={
                    "select": "id,trend_id,hook,body,voice",
                    "order": "created_at.desc",
                    "limit": str(limit),
                },
            )
            if response.status_code >= 400:
                return []
            return [
                {
                    "id": row["id"],
                    "trend_id": row.get("trend_id"),
                    "label": (row.get("hook") or "")[:80] or f"historical-{row['id']}",
                    "source_type": "historical-post",
                    "hook": row["hook"],
                    "body": row["body"],
                }
                for row in response.json()
            ]

        if self.mode != "local":
            return []

        state = self._load_state()
        recent = state["posts"][-limit:]
        return [
            {
                "id": row["id"],
                "trend_id": row.get("trend_id"),
                "label": (row.get("hook") or "")[:80] or f"historical-{row['id']}",
                "source_type": "historical-post",
                "hook": row["hook"],
                "body": row["body"],
            }
            for row in recent
        ]

    def cleanup_old_trends(self) -> int:
        if self.mode == "supabase_rest":
            cutoff = (datetime.now(UTC) - timedelta(hours=self.settings.trend_ttl_hours)).isoformat()
            response = self._request(
                "DELETE",
                "trend_events",
                params={"created_at": f"lt.{cutoff}"},
                prefer="return=representation",
            )
            if response.status_code >= 400:
                return 0
            return len(response.json() or [])

        if self.mode != "local":
            return 0

        state = self._load_state()
        cutoff = datetime.now(UTC) - timedelta(hours=self.settings.trend_ttl_hours)
        before = len(state["trends"])
        state["trends"] = [
            row for row in state["trends"] if datetime.fromisoformat(row["created_at"]) >= cutoff
        ]
        self._save_state(state)
        return before - len(state["trends"])
