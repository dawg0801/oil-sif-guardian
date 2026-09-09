"""
OIL-SIF Guardian — IOGP Life-Saving Rules Pydantic Schemas
Data contracts for multi-label rule predictions, 9x9 co-occurrence matrices,
dynamic calibration thresholds, and golden benchmark evaluation reports.
"""

from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class IOGPPredictRequest(BaseModel):
    narrative: str = Field(..., min_length=5, description="Unstructured incident or near-miss narrative.")
    title: Optional[str] = Field(default="", description="Optional incident headline or activity summary.")
    threshold_overrides: Optional[Dict[str, float]] = Field(
        default=None,
        description="Optional custom decision thresholds tau_k for specific IOGP rules."
    )


class IOGPRuleResult(BaseModel):
    rule_name: str
    probability: float
    threshold: float
    is_triggered: bool
    rank: int
    evidence_spans: List[str] = Field(default_factory=list)


class IOGPCoOccurrenceItem(BaseModel):
    rule_a: str
    rule_b: str
    historical_co_occurrences: int
    synergy_confidence: float


class IOGPMultiLabelResponse(BaseModel):
    primary_rule: str
    secondary_rules: List[str]
    triggered_rules: List[str]
    rule_scores: Dict[str, IOGPRuleResult]
    co_occurrence_tags: List[IOGPCoOccurrenceItem]
    latency_ms: float
    raw_text: str


class IOGPTopPair(BaseModel):
    rule_1: str
    rule_2: str
    co_occurrence_count: int


class IOGPMatrixResponse(BaseModel):
    rules: List[str]
    matrix: List[List[int]]
    prevalence: Dict[str, int]
    top_pairs: List[IOGPTopPair]


class IOGPPerRuleReport(BaseModel):
    rule_name: str
    true_positives: int
    false_positives: int
    false_negatives: int
    true_negatives: int
    support: int
    precision: float
    recall: float
    f1: float


class IOGPEvaluationReportResponse(BaseModel):
    total_samples: int
    hamming_loss: float
    subset_accuracy: float
    jaccard_similarity: float
    micro_precision: float
    micro_recall: float
    micro_f1: float
    macro_precision: float
    macro_recall: float
    macro_f1: float
    primary_rule_accuracy: float
    per_rule_metrics: Dict[str, IOGPPerRuleReport]
    average_latency_ms: float
    evaluated_at: str


class IOGPThresholdUpdateRequest(BaseModel):
    thresholds: Dict[str, float] = Field(
        ...,
        description="Dictionary mapping IOGP rule names to new decision thresholds in [0.10, 0.90]."
    )


class IOGPThresholdUpdateResponse(BaseModel):
    updated: bool
    current_thresholds: Dict[str, float]
    message: str
