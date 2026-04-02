from app.services.similarity import SimilarityChecker


def test_similarity_blocks_near_duplicate_text():
    checker = SimilarityChecker(
        corpus_entries=[
            {
                "id": "creator-1",
                "creator": "Reference Creator",
                "source_type": "creator-guide",
                "reference_summary": "Most banking automation still stops before the real bottleneck. Map the handoff and remove inbox latency.",
                "pattern_note": "Short opener and direct workflow takeaway.",
            }
        ]
    )

    result = checker.score_text(
        "Most banking automation still stops before the real bottleneck. Map the handoff and remove inbox latency."
    )

    assert result.status == "blocked"
    assert result.max_score >= 45


def test_similarity_clears_original_text():
    checker = SimilarityChecker(
        corpus_entries=[
            {
                "id": "creator-1",
                "creator": "Reference Creator",
                "source_type": "creator-guide",
                "reference_summary": "Short punchy posts about creator systems and distribution loops.",
                "pattern_note": "Focus on hooks and whitespace.",
            }
        ]
    )

    result = checker.score_text(
        "Fintech operations teams are entering a new phase where auditability matters more than novelty."
    )

    assert result.status == "clear"
