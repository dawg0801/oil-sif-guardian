"""
OIL-SIF Guardian — Annotation & Benchmark Evaluation Schemas.
"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class AnnotatedItem(BaseModel):
    item_id: str
    raw_text: str
    is_psif: bool
    priority: str = Field(description="HIGH, LOW, or REVIEW")
    primary_rule: Optional[str] = None
    evidence_spans: List[Dict[str, Any]] = Field(default_factory=list)
    annotator_id: Optional[str] = None
    notes: Optional[str] = None


class AgreementCalculationRequest(BaseModel):
    annotator_a_items: List[AnnotatedItem]
    annotator_b_items: List[AnnotatedItem]


class AgreementMetricsResponse(BaseModel):
    total_items: int
    disagreement_count: int
    disagreement_rate: float
    metrics: Dict[str, Any]
    disagreements: List[Dict[str, Any]]


class AdjudicationRequest(BaseModel):
    annotator_a_items: List[AnnotatedItem]
    annotator_b_items: List[AnnotatedItem]


class AdjudicationBatchResponse(BaseModel):
    total_processed: int
    consensus_count: int
    dispute_count: int
    consensus_rate: float
    approved_items: List[Dict[str, Any]]
    pending_disputes: List[Dict[str, Any]]


class DisputeResolutionRequest(BaseModel):
    dispute_item: Dict[str, Any]
    lead_id: str
    final_is_psif: bool
    final_priority: str
    final_primary_rule: str
    final_spans: Optional[List[Dict[str, Any]]] = None
    rationale: str = ""


class BenchmarkSummaryResponse(BaseModel):
    total_benchmark_records: int
    rule_breakdown: Dict[str, int]
    priority_breakdown: Dict[str, int]
    sample_cases: List[Dict[str, Any]]


class BenchmarkEvaluationResult(BaseModel):
    total_evaluated: int
    psif_accuracy: float
    psif_precision: float
    psif_recall: float
    psif_f1: float
    rule_match_rate: float
    evaluated_cases: List[Dict[str, Any]]
