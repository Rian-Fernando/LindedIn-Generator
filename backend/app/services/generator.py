from __future__ import annotations

import json
import re
from random import sample
from uuid import uuid4

from app.core.config import Settings
from app.models.schemas import GeneratedPost, TaggingHint, TrendBrief, TrendItem, VoicePreset


WHITESPACE_RE = re.compile(r"\s+")
FRESH_ANGLE_OPTIONS = [
    "execution bottleneck",
    "workflow risk",
    "deal-team leverage",
    "compliance implication",
    "customer buying signal",
    "operating tradeoff",
    "implementation lesson",
    "market structure implication",
]


class GeneratorService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.generation_prompt = settings.generation_prompt_path.read_text(encoding="utf-8").strip()

    def _render_user_prompt(
        self,
        trend_brief: TrendBrief,
        voice: VoicePreset,
        feedback_summary: str,
        style_context: str,
        count: int,
        retry_note: str = "",
        batch_nonce: str = "",
        recent_history_note: str = "",
        angle_note: str = "",
    ) -> str:
        trend_json = [
            {
                "id": item.id,
                "title": item.title,
                "source": item.source,
                "source_type": item.source_type,
                "url": item.url,
                "summary": item.summary,
                "published_at": item.published_at.isoformat() if item.published_at else None,
                "relevance_reason": item.relevance_reason,
            }
            for item in trend_brief.items
        ]
        return "\n\n".join(
            [
                self.generation_prompt.format(count=count),
                f"Voice preset: {voice.value}",
                f"Feedback loop summary: {feedback_summary}",
                f"Batch nonce: {batch_nonce}",
                angle_note,
                recent_history_note,
                "Style context:\n" + style_context,
                "Trend brief:\n" + json.dumps(trend_json, indent=2),
                (
                    "Return only JSON with a top-level 'posts' array. "
                    "Each post must be original, credible, readable, and tailored to investment banking plus fintech automation."
                ),
                retry_note,
            ]
        )

    def _parse_generated_posts(self, payload: dict, voice: VoicePreset, source_map: dict[str, TrendItem]) -> list[GeneratedPost]:
        posts: list[GeneratedPost] = []
        for raw in payload.get("posts", []):
            if not isinstance(raw, dict):
                continue

            trend_id = raw.get("trend_id") if isinstance(raw.get("trend_id"), str) else None
            if trend_id not in source_map:
                trend_id = next(iter(source_map))
            trend = source_map[trend_id]

            hints = [
                TaggingHint(
                    entity=item["entity"],
                    entity_type=item["entity_type"],
                    reason=item["reason"],
                )
                for item in self._coerce_tagging_hints(raw.get("tagging_hints"))
            ]

            hashtags = self._coerce_string_list(raw.get("hashtags"))
            source_ids = [
                source_id for source_id in self._coerce_string_list(raw.get("source_ids")) if source_id in source_map
            ] or [trend_id]
            hook = raw.get("hook", "")
            body = raw.get("body", "")
            hook_type = raw.get("hook_type", "insight")
            post_format = raw.get("format", "mid")

            posts.append(
                GeneratedPost(
                    id=f"post-{uuid4().hex[:10]}",
                    trend_id=trend_id,
                    trend_title=trend.title,
                    voice=voice,
                    hook=hook.strip() if isinstance(hook, str) else str(hook).strip(),
                    hook_type=hook_type if isinstance(hook_type, str) and hook_type else "insight",
                    body=body.strip() if isinstance(body, str) else str(body).strip(),
                    format=self._coerce_post_format(post_format),
                    hashtags=hashtags,
                    tagging_hints=hints,
                    source_ids=source_ids,
                    sources=[source_map[source_id] for source_id in source_ids] or [trend],
                )
            )
        return posts

    def _coerce_string_list(self, value) -> list[str]:
        if isinstance(value, list):
            return [item.strip() for item in value if isinstance(item, str) and item.strip()]
        if isinstance(value, str) and value.strip():
            return [item.strip() for item in value.split(",") if item.strip()]
        return []

    def _coerce_post_format(self, value) -> str:
        if value in {"short", "mid", "long"}:
            return value
        return "mid"

    def _coerce_tagging_hints(self, value) -> list[dict[str, str]]:
        if not isinstance(value, list):
            return []
        cleaned: list[dict[str, str]] = []
        for item in value:
            if not isinstance(item, dict):
                continue
            entity = item.get("entity")
            entity_type = item.get("entity_type")
            reason = item.get("reason")
            if not isinstance(entity, str) or not entity.strip():
                continue
            if entity_type not in {"company", "person"}:
                continue
            if not isinstance(reason, str) or not reason.strip():
                continue
            cleaned.append(
                {
                    "entity": entity.strip(),
                    "entity_type": entity_type,
                    "reason": reason.strip(),
                }
            )
        return cleaned

    def _generate_with_openai(
        self,
        trend_brief: TrendBrief,
        voice: VoicePreset,
        feedback_summary: str,
        style_context: str,
        count: int,
        retry_note: str = "",
        batch_nonce: str = "",
        recent_history_note: str = "",
        angle_note: str = "",
    ) -> list[GeneratedPost]:
        from openai import OpenAI

        if not self.settings.openai_model:
            raise ValueError("OPENAI_MODEL is required when OPENAI_API_KEY is set")

        client = OpenAI(api_key=self.settings.openai_api_key)
        source_map = {item.id: item for item in trend_brief.items}
        response = client.chat.completions.create(
            model=self.settings.openai_model,
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": "You are a top-tier B2B LinkedIn strategist and copywriter.",
                },
                {
                    "role": "user",
                    "content": self._render_user_prompt(
                        trend_brief,
                        voice,
                        feedback_summary,
                        style_context,
                        count,
                        retry_note,
                        batch_nonce,
                        recent_history_note,
                        angle_note,
                    ),
                },
            ],
        )
        content = response.choices[0].message.content or "{}"
        parsed = json.loads(content)
        return self._parse_generated_posts(parsed, voice, source_map)

    def active_provider(self) -> str | None:
        if self.settings.openai_api_key:
            return "openai"
        return None

    def provider_status(self) -> dict:
        if self.settings.openai_api_key or self.settings.openai_model:
            return {
                "provider": "openai",
                "key_present": bool(self.settings.openai_api_key),
                "model_present": bool(self.settings.openai_model),
                "configured": bool(self.settings.openai_api_key and self.settings.openai_model),
            }
        return {
            "provider": None,
            "key_present": False,
            "model_present": False,
            "configured": False,
        }

    def _normalize(self, value: str) -> str:
        return WHITESPACE_RE.sub(" ", value.strip().lower())

    def _validate_posts(
        self,
        posts: list[GeneratedPost],
        count: int,
        historical_signatures: set[str],
    ) -> tuple[bool, str]:
        if len(posts) != count:
            return False, f"Expected exactly {count} posts, received {len(posts)}."

        seen_trends: set[str] = set()
        seen_content: set[str] = set()

        for post in posts:
            if post.trend_id in seen_trends:
                return False, "Duplicate trend usage detected in generated batch."
            seen_trends.add(post.trend_id)

            signature = self._normalize(f"{post.hook}\n{post.body}")
            if signature in seen_content:
                return False, "Duplicate post content detected in generated batch."
            if signature in historical_signatures:
                return False, "Generated content matches a recent historical post too closely."
            seen_content.add(signature)

        return True, ""

    def _build_recent_history_note(self, historical_posts: list[dict]) -> str:
        if not historical_posts:
            return ""
        snippets = []
        for row in historical_posts[:5]:
            hook = row.get("hook", "").strip()
            if not hook:
                continue
            snippets.append(f"- {hook}")
        if not snippets:
            return ""
        return (
            "Avoid repeating the framing, hook language, or body structure of these recent generated posts:\n"
            + "\n".join(snippets)
        )

    def generate(
        self,
        trend_brief: TrendBrief,
        voice: VoicePreset,
        feedback_summary: str,
        style_context: str,
        count: int,
        historical_posts: list[dict] | None = None,
    ) -> list[GeneratedPost]:
        if self.active_provider() is None:
            raise RuntimeError(
                "No AI provider configured. Set OPENAI_API_KEY and OPENAI_MODEL."
            )

        retry_note = ""
        recent_posts = historical_posts or []
        historical_signatures = {
            self._normalize(f"{row.get('hook', '')}\n{row.get('body', '')}")
            for row in recent_posts
            if row.get("hook") or row.get("body")
        }
        recent_history_note = self._build_recent_history_note(recent_posts)
        for _ in range(3):
            batch_nonce = uuid4().hex
            angle_note = (
                "Fresh angle targets for this batch: "
                + ", ".join(sample(FRESH_ANGLE_OPTIONS, k=3))
                + ". Use different hooks and framing than recent outputs."
            )
            posts = self._generate_with_openai(
                trend_brief,
                voice,
                feedback_summary,
                style_context,
                count,
                retry_note,
                batch_nonce,
                recent_history_note,
                angle_note,
            )

            valid, reason = self._validate_posts(posts, count, historical_signatures)
            if valid:
                return posts
            retry_note = (
                "Retry because the previous batch was invalid. "
                + reason
                + " Return a fresh batch with unique trends and unique post bodies."
            )

        raise RuntimeError("Generator returned duplicate or incomplete posts after 3 attempts.")
