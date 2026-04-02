from __future__ import annotations

import re

from app.models.schemas import TaggingHint, TrendItem


KNOWN_ENTITIES: dict[str, str] = {
    # Major banks
    "Goldman Sachs": "company",
    "JPMorgan": "company",
    "Morgan Stanley": "company",
    "Bank of America": "company",
    "Citigroup": "company",
    "Citi": "company",
    "Wells Fargo": "company",
    "Deutsche Bank": "company",
    "Barclays": "company",
    "UBS": "company",
    "Credit Suisse": "company",
    "HSBC": "company",
    "BNY Mellon": "company",
    "Lazard": "company",
    "Jefferies": "company",
    "Evercore": "company",
    # Fintech / payments
    "Stripe": "company",
    "Plaid": "company",
    "Visa": "company",
    "Mastercard": "company",
    "Adyen": "company",
    "Klarna": "company",
    "Robinhood": "company",
    "Square": "company",
    "Block": "company",
    "PayPal": "company",
    "Brex": "company",
    "Ramp": "company",
    "Mercury": "company",
    "Marqeta": "company",
    "Affirm": "company",
    "Wise": "company",
    "Revolut": "company",
    "Chime": "company",
    "SoFi": "company",
    "Nubank": "company",
    "Rapyd": "company",
    "Toast": "company",
    "Checkout.com": "company",
    # Data / AI / infra
    "Bloomberg": "company",
    "Nasdaq": "company",
    "Refinitiv": "company",
    "Palantir": "company",
    "Databricks": "company",
    "Snowflake": "company",
    "OpenAI": "company",
    "Perplexity": "company",
    "Google": "company",
    "Microsoft": "company",
    "AWS": "company",
    "Salesforce": "company",
    # Consulting / advisory
    "McKinsey": "company",
    "Deloitte": "company",
    "Accenture": "company",
    "PwC": "company",
    "EY": "company",
    "KPMG": "company",
    "Gartner": "company",
    "Forrester": "company",
    "CB Insights": "company",
    # Regulators
    "SEC": "company",
    "CFPB": "company",
    "OCC": "company",
    "FDIC": "company",
    "FINRA": "company",
    "Federal Reserve": "company",
    "Fed": "company",
    # People — fintech / banking voices
    "Jamie Dimon": "person",
    "David Solomon": "person",
    "Patrick Collison": "person",
    "John Collison": "person",
    "Jack Dorsey": "person",
    "Dan Schulman": "person",
    "Vlad Tenev": "person",
    "Max Levchin": "person",
    "Justin Welsh": "person",
    "Ross Simmonds": "person",
    "Jelena McWilliams": "person",
}


def infer_tagging_hints(body: str, related_sources: list[TrendItem]) -> list[TaggingHint]:
    text = " ".join([body, *(item.title for item in related_sources), *(item.summary for item in related_sources)])
    hints: list[TaggingHint] = []

    text_lower = text.lower()
    for entity, entity_type in KNOWN_ENTITIES.items():
        pattern = r"\b" + re.escape(entity.lower()) + r"\b"
        if not re.search(pattern, text_lower):
            continue
        if any(existing.entity == entity for existing in hints):
            continue
        reason = "Mentioned in the post and backed by the sourced trend brief."
        hints.append(TaggingHint(entity=entity, entity_type=entity_type, reason=reason))

    return hints[:2]
