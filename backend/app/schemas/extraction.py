"""
OIL-SIF Guardian — Extraction & NER Schemas
Pydantic models for safety entity extraction, BIO sequence tagging, and causal reasoning flow.
"""

from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class EntitySpanSchema(BaseModel):
    text: str = Field(..., description="Exact substring matched in the raw narrative")
    label: str = Field(..., description="Safety entity category label")
    start_char: int = Field(..., description="0-indexed start character offset in raw narrative")
    end_char: int = Field(..., description="0-indexed end character offset in raw narrative")
    confidence: float = Field(1.0, description="Extraction confidence score (0.0 to 1.0)")
    source: str = Field("GAZETTEER", description="Source rule/engine that extracted the span")
    category_description: Optional[str] = Field("", description="Domain description of the safety category")


class CausalStepSchema(BaseModel):
    step_id: int
    node_key: str
    title: str
    category: str
    detected_entities: List[str]
    has_evidence: bool
    summary: str
    icon_hint: str
    severity_level: str


class CausalFlowSchema(BaseModel):
    steps: List[CausalStepSchema]
    completeness_score: float
    risk_level: str
    causal_narrative: str
    key_failure_mechanism: str
    suggested_critical_controls: List[str]
    audit_grounding: Dict[str, List[EntitySpanSchema]]


class ExtractionRequest(BaseModel):
    narrative: str = Field(..., min_length=5, description="Raw unstructured HSSE incident or observation narrative")
    activity: Optional[str] = Field(None, description="Optional operational activity context")
    site: Optional[str] = Field(None, description="Optional operating asset or facility name")


class ExtractionResponse(BaseModel):
    narrative: str
    entities_by_category: Dict[str, List[EntitySpanSchema]]
    all_spans: List[EntitySpanSchema]
    causal_flow: CausalFlowSchema
    summary_text: str
    entity_counts: Dict[str, int]
    total_entities: int


class BIOTokenSchema(BaseModel):
    token: str
    tag: str
    start_char: int
    end_char: int


class BIOTaggingResponse(BaseModel):
    narrative: str
    tokens: List[BIOTokenSchema]
    total_tokens: int
    entity_tokens_count: int
    conll_format: str


class NERTaxonomyResponse(BaseModel):
    supported_categories: List[str]
    category_descriptions: Dict[str, str]
    builtin_terms_count: int
    terms_by_category: Dict[str, int]
    trie_entries_loaded: int
    regex_patterns_count: int
    engine: str
