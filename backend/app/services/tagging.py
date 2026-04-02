from __future__ import annotations

from app.models.schemas import TaggingHint, TrendItem


KNOWN_ENTITIES: dict[str, str] = {
    "Goldman Sachs": "company",
    "JPMorgan": "company",
    "Stripe": "company",
    "Plaid": "company",
    "Visa": "company",
    "Mastercard": "company",
    "OpenAI": "company",
    "Adyen": "company",
    "Bloomberg": "company",
    "Nasdaq": "company",
    "Klarna": "company",
    "Robinhood": "company",
    "Perplexity": "company",
    "Jelena McWilliams": "person",
    "Justin Welsh": "person",
    "Ross Simmonds": "person",
}


def infer_tagging_hints(body: str, related_sources: list[TrendItem]) -> list[TaggingHint]:
    text = " ".join([body, *(item.title for item in related_sources), *(item.summary for item in related_sources)])
    hints: list[TaggingHint] = []

    for entity, entity_type in KNOWN_ENTITIES.items():
        if entity.lower() not in text.lower():
            continue
        if any(existing.entity == entity for existing in hints):
            continue
        reason = "Mentioned in the post and backed by the sourced trend brief."
        hints.append(TaggingHint(entity=entity, entity_type=entity_type, reason=reason))

    return hints[:2]
