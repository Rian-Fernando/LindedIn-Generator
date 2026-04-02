from __future__ import annotations

import json
from collections import Counter

from app.core.config import Settings
from app.models.schemas import StyleGuideResponse, VoicePreset


class StyleGuideService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def _read_text(self, path) -> str:
        return path.read_text(encoding="utf-8").strip()

    def _read_corpus(self) -> list[dict]:
        return json.loads(self.settings.influencer_corpus_path.read_text(encoding="utf-8"))

    def get_style_bundle(self) -> StyleGuideResponse:
        corpus = self._read_corpus()
        hook_counter: Counter[str] = Counter()
        structure_counter: Counter[str] = Counter()
        credibility_counter: Counter[str] = Counter()

        for entry in corpus:
            hook_counter.update(entry.get("hook_types", []))
            structure_counter.update(entry.get("structure", []))
            credibility_counter.update(entry.get("credibility_moves", []))

        pattern_summary = {
            "top_hook_types": [item for item, _ in hook_counter.most_common(5)],
            "top_structure_patterns": [item for item, _ in structure_counter.most_common(5)],
            "top_credibility_moves": [item for item, _ in credibility_counter.most_common(5)],
        }

        return StyleGuideResponse(
            style_guide=self._read_text(self.settings.style_guide_path),
            voice_guides={
                VoicePreset.FOUNDER.value: self._read_text(self.settings.founder_voice_path),
                VoicePreset.COMPANY.value: self._read_text(self.settings.company_voice_path),
            },
            research_corpus=corpus,
            pattern_summary=pattern_summary,
        )

    def build_generation_context(self, voice: VoicePreset) -> str:
        bundle = self.get_style_bundle()
        corpus_notes = "\n".join(
            f"- {entry['creator']}: {entry['pattern_note']}"
            for entry in bundle.research_corpus
        )
        return "\n\n".join(
            [
                bundle.style_guide,
                bundle.voice_guides[voice.value],
                "Reference creator pattern notes:\n" + corpus_notes,
            ]
        )
