"""
OIL-SIF Guardian — Sequence Modeling & Model Studio Schemas
Pydantic contracts for contextual inference, token attribution heatmaps,
tri-model ensemble arbitration, and 4-way benchmark reports.
"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class SequencePredictRequest(BaseModel):
    narrative: str = Field(..., min_length=5, description="Raw unstructured HSSE incident narrative")
    activity: Optional[str] = Field(None, description="Optional operational activity context")
    site: Optional[str] = Field(None, description="Optional facility or asset name")


class SequencePredictResponse(BaseModel):
    predicted_class: str
    raw_probabilities: Dict[str, float]
    calibrated_probabilities: Dict[str, float]
    confidence_level: str
    temperature: float
    iogp_rule_scores: Dict[str, float]
    top_iogp_rules: List[Dict[str, Any]]
    inference_latency_ms: float


class TokenAttributionRequest(BaseModel):
    narrative: str = Field(..., min_length=5, description="Raw unstructured HSSE incident narrative")


class TokenAttributionItemSchema(BaseModel):
    token: str
    saliency_score: float
    start_char: int
    end_char: int
    role: str
    color_hex: str
    rationale: str


class TokenAttributionResponse(BaseModel):
    narrative: str
    tokens: List[TokenAttributionItemSchema]
    top_risk_amplifiers: List[Dict[str, Any]]
    top_mitigators: List[Dict[str, Any]]
    saliency_balance: float
    predicted_sif_class: str
    confidence_level: str


class EnsembleArbitrationRequest(BaseModel):
    narrative: str = Field(..., min_length=5, description="Raw unstructured HSSE incident narrative")
    activity: Optional[str] = Field(None, description="Optional operational activity")
    site: Optional[str] = Field(None, description="Optional facility name")


class EnsembleArbitrationResponse(BaseModel):
    final_priority: str
    confidence_score: float
    safety_override: bool
    override_reason: Optional[str]
    rule_engine_decision: Dict[str, Any]
    tfidf_decision: Dict[str, Any]
    contextual_decision: Dict[str, Any]
    blended_probabilities: Dict[str, float]
    final_iogp_rules: List[Dict[str, Any]]
    arbitration_summary: str
    latency_ms: float


class ModelBenchmarkItemSchema(BaseModel):
    model_name: str
    total_samples: int
    high_psif_recall: float
    high_psif_precision: float
    high_psif_f1: float
    overall_accuracy: float
    iogp_rule_match_rate: float
    average_latency_ms: float
    confusion_matrix: Dict[str, Dict[str, int]]


class FourWayBenchmarkResponse(BaseModel):
    timestamp: str
    total_benchmark_samples: int
    deterministic_rule_engine: ModelBenchmarkItemSchema
    tfidf_baseline: ModelBenchmarkItemSchema
    contextual_sequence_classifier: ModelBenchmarkItemSchema
    tri_model_ensemble: ModelBenchmarkItemSchema
    key_findings: List[str]


class ModelStatusResponse(BaseModel):
    model_version: str
    is_trained: bool
    temperature: float
    vocabulary_size: int
    training_samples: int
    supported_rules: List[str]
