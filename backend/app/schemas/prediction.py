"""
Pydantic Schemas for PSIF Predictions, IOGP Rules, Entities, and Explainability.
"""

from typing import List, Optional

from pydantic import BaseModel, Field


class EvidenceSpanSchema(BaseModel):
    text: str
    start_char: int
    end_char: int
    category: str = Field(description="EXPOSURE, HAZARD, CONTROL_FAILURE, etc.")


class IOGPRulePredictionSchema(BaseModel):
    rule_name: str
    probability: float = Field(ge=0.0, le=1.0)
    is_primary: bool = False


class EntitiesSchema(BaseModel):
    hazards: List[str] = Field(default_factory=list)
    energy_sources: List[str] = Field(default_factory=list)
    exposures: List[str] = Field(default_factory=list)
    controls: List[str] = Field(default_factory=list)
    control_failures: List[str] = Field(default_factory=list)
    consequences: List[str] = Field(default_factory=list)


class PSIFSchema(BaseModel):
    probability: float = Field(ge=0.0, le=1.0)
    priority: str = Field(description="HIGH, LOW, or REVIEW")
    confidence: str = Field(description="HIGH, MEDIUM, or LOW")
    calibration_factor: Optional[float] = 1.0


class SafetyTriageResponse(BaseModel):
    psif: PSIFSchema
    life_saving_rules: List[IOGPRulePredictionSchema]
    entities: EntitiesSchema
    evidence_spans: List[EvidenceSpanSchema]
    triggered_rules: List[str]
    safety_reasoning: List[str]
    exposure_fingerprint: str
    model_version: str
