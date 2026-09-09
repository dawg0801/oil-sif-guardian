"""
OIL-SIF Guardian — Extraction & Safety NER Endpoints
Provides API endpoints for 8-dimension safety information extraction,
token-level BIO sequence tagging, and explainable causal reasoning flows.
"""

from typing import Dict, List

from fastapi import APIRouter, HTTPException, status

from backend.app.schemas.extraction import (
    BIOTaggingResponse,
    BIOTokenSchema,
    CausalFlowSchema,
    CausalStepSchema,
    EntitySpanSchema,
    ExtractionRequest,
    ExtractionResponse,
    NERTaxonomyResponse,
)
from ml.extraction.causal_reasoner import CausalReasoner
from ml.extraction.safety_ner import SafetyEntityCategory, SafetyNER

router = APIRouter()

# Instantiate persistent engines
_ner_engine = SafetyNER()
_causal_reasoner = CausalReasoner(ner_engine=_ner_engine)


@router.post("/entities", response_model=ExtractionResponse, summary="Extract 8-dimension safety entities & causal flow")
def extract_safety_entities(req: ExtractionRequest) -> ExtractionResponse:
    """
    Analyzes an unstructured HSSE narrative and extracts grounded safety entities
    across 8 core dimensions with exact character offsets, followed by causal reasoning synthesis.
    """
    if not req.narrative or not req.narrative.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Narrative must not be empty."
        )

    # 1. Extract Spans
    spans = _ner_engine.extract_entities(req.narrative)

    # Convert to schema
    span_schemas = [
        EntitySpanSchema(
            text=s.text,
            label=s.label,
            start_char=s.start_char,
            end_char=s.end_char,
            confidence=s.confidence,
            source=s.source,
            category_description=s.category_description
        ) for s in spans
    ]

    # Group by category
    grouped: Dict[str, List[EntitySpanSchema]] = {cat: [] for cat in SafetyEntityCategory.ALL_CATEGORIES}
    counts: Dict[str, int] = {cat: 0 for cat in SafetyEntityCategory.ALL_CATEGORIES}
    for s in span_schemas:
        if s.label in grouped:
            grouped[s.label].append(s)
            counts[s.label] += 1
        else:
            grouped[s.label] = [s]
            counts[s.label] = 1

    # 2. Causal Flow Analysis
    causal_res = _causal_reasoner.analyze(req.narrative, activity_context=req.activity)

    causal_steps = [
        CausalStepSchema(
            step_id=s.step_id,
            node_key=s.node_key,
            title=s.title,
            category=s.category,
            detected_entities=s.detected_entities,
            has_evidence=s.has_evidence,
            summary=s.summary,
            icon_hint=s.icon_hint,
            severity_level=s.severity_level
        ) for s in causal_res.steps
    ]

    causal_flow = CausalFlowSchema(
        steps=causal_steps,
        completeness_score=causal_res.completeness_score,
        risk_level=causal_res.risk_level,
        causal_narrative=causal_res.causal_narrative,
        key_failure_mechanism=causal_res.key_failure_mechanism,
        suggested_critical_controls=causal_res.suggested_critical_controls,
        audit_grounding=grouped
    )

    summary_text = (
        f"Extracted {len(span_schemas)} grounded entities across {sum(1 for c in counts.values() if c > 0)} "
        f"safety categories with causal completeness of {int(causal_res.completeness_score * 100)}%."
    )

    return ExtractionResponse(
        narrative=req.narrative,
        entities_by_category=grouped,
        all_spans=span_schemas,
        causal_flow=causal_flow,
        summary_text=summary_text,
        entity_counts=counts,
        total_entities=len(span_schemas)
    )


@router.post("/bio-tag", response_model=BIOTaggingResponse, summary="Generate tokenized BIO sequence representation")
def generate_bio_tagging(req: ExtractionRequest) -> BIOTaggingResponse:
    """
    Tokenizes the narrative and produces standard BIO sequence tags (B-TAG, I-TAG, O)
    for model fine-tuning and evaluation.
    """
    if not req.narrative or not req.narrative.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Narrative must not be empty."
        )

    bio_tags = _ner_engine.generate_bio_tags(req.narrative)

    tokens = [
        BIOTokenSchema(
            token=b.token,
            tag=b.tag,
            start_char=b.start_char,
            end_char=b.end_char
        ) for b in bio_tags
    ]

    entity_tokens_count = sum(1 for b in bio_tags if b.tag != "O")

    # Format CoNLL-2003 representation
    conll_lines = [f"{b.token}\t{b.tag}" for b in bio_tags]
    conll_format = "\n".join(conll_lines)

    return BIOTaggingResponse(
        narrative=req.narrative,
        tokens=tokens,
        total_tokens=len(tokens),
        entity_tokens_count=entity_tokens_count,
        conll_format=conll_format
    )


@router.get("/taxonomy", response_model=NERTaxonomyResponse, summary="Retrieve supported NER categories & gazetteer stats")
def get_ner_taxonomy() -> NERTaxonomyResponse:
    """
    Returns the supported safety entity categories, descriptions, and gazetteer size metrics.
    """
    stats = _ner_engine.get_taxonomy_statistics()
    return NERTaxonomyResponse(
        supported_categories=stats["supported_categories"],
        category_descriptions=stats["category_descriptions"],
        builtin_terms_count=stats["builtin_terms_count"],
        terms_by_category=stats["terms_by_category"],
        trie_entries_loaded=stats["trie_entries_loaded"],
        regex_patterns_count=stats["regex_patterns_count"],
        engine=stats["engine"]
    )
