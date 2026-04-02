from app.models.schemas import TaggingHint
from app.services.linting import lint_post


def test_lint_flags_missing_credibility_and_weak_hook():
    result = lint_post(
        hook="I think automation is amazing",
        body="This is very exciting.\n\nIt will change everything.\n\nHope this helps.",
        hashtags=["#One", "#Two", "#Three", "#Four", "#Five", "#Six"],
        tagging_hints=[
            TaggingHint(entity="Stripe", entity_type="company", reason="Mentioned in source"),
            TaggingHint(entity="Plaid", entity_type="company", reason="Mentioned in source"),
            TaggingHint(entity="Visa", entity_type="company", reason="Mentioned in source"),
        ],
    )

    assert result.score < 60
    assert "Weak hook" in result.flags
    assert "Missing credibility" in result.flags
    assert "Hashtag spam" in result.flags


def test_lint_passes_cleaner_post():
    result = lint_post(
        hook="Most diligence bottlenecks are still handoff problems, not model problems.",
        body=(
            "A $200M process does not break because the model was slow. It breaks because data, approvals, "
            "and comments move across too many tools.\n\n"
            "In Q1 2026, teams that tighten those handoffs will compress cycle time faster than teams that only "
            "buy another point solution.\n\n"
            "Concrete takeaway: map one approval step this week and measure how many hours it adds to the deal."
        ),
        hashtags=["#Fintech", "#InvestmentBanking", "#Automation"],
        tagging_hints=[],
    )

    assert result.score >= 80
    assert result.flags == []
