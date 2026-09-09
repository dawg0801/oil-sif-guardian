"""
OIL-SIF Guardian — Calibrated Hybrid Decision Engine Pydantic Schemas
Data contracts for multi-model decision fusion, probability calibration,
reliability curve binning, and dynamic ensemble weight tuning.
"""

from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class HybridDecisionRequest(BaseModel):
    narrative: str = Field(..., min_length=5, description="Unstructured incident or near-miss narrative text.")
    title: Optional[str] = Field(default="", description="Optional incident headline or task description.")
    weight_overrides: Optional[Dict[str, float]] = Field(
        default=None,
        description="Optional temporary overrides for model ensemble weights (sequence_weight, iogp_weight, tfidf_weight)."
    )
    tau_high_override: Optional[float] = Field(default=None, description="Optional override for High-PSIF threshold.")
    tau_low_override: Optional[float] = Field(default=None, description="Optional override for Low-PSIF threshold.")


class ModelContribution(BaseModel):
    model_name: str
    raw_probability: float
    assigned_weight: float
    weighted_probability: float


class HybridDecisionResponse(BaseModel):
    fused_psif_probability: float
    priority: str
    confidence_score: float
    is_veto_enforced: bool
    is_benign: bool
    decision_rationale: List[str]
    primary_iogp_rule: str
    secondary_iogp_rules: List[str]
    triggered_rules: List[str]
    model_contributions: Dict[str, ModelContribution]
    calibration_factor: float
    latency_ms: float
    raw_text: str


class CalibrationBinPoint(BaseModel):
    bin_index: int
    bin_lower: float
    bin_upper: float
    sample_count: int
    mean_confidence: float
    empirical_accuracy: float


class CalibrationReportResponse(BaseModel):
    total_samples: int
    true_high_psif_count: int
    detected_high_psif_count: int
    high_psif_recall: float
    priority_accuracy: float
    ece: float
    mce: float
    brier_score: float
    temperature: float
    bins: List[CalibrationBinPoint]
    active_weights: Dict[str, float]
    active_thresholds: Dict[str, float]
    evaluated_at: str


class WeightTuneRequest(BaseModel):
    sequence_weight: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    iogp_weight: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    tfidf_weight: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    tau_high: Optional[float] = Field(default=None, ge=0.2, le=0.9)
    tau_low: Optional[float] = Field(default=None, ge=0.05, le=0.6)
    temperature: Optional[float] = Field(default=None, ge=0.1, le=5.0)


class WeightTuneResponse(BaseModel):
    updated: bool
    current_weights: Dict[str, float]
    message: str


class DecisionStatusResponse(BaseModel):
    engine_name: str = "CalibratedHybridDecisionEngine"
    version: str = "1.0.0"
    models_loaded: Dict[str, bool]
    active_weights: Dict[str, float]
    active_thresholds: Dict[str, float]
    temperature: float
    zero_tolerance_enforced: bool = True
