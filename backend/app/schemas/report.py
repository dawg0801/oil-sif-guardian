"""
Pydantic Schemas for Safety Report Ingestion and Canonical Representation.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from backend.app.schemas.action import CorrectiveActionResponse
from backend.app.schemas.prediction import EntitiesSchema, EvidenceSpanSchema, IOGPRulePredictionSchema, PSIFSchema
from backend.app.schemas.review import ReviewResponse


class ReportCreate(BaseModel):
    report_type: str = Field(default="near_miss", description="near_miss, unsafe_act, unsafe_condition, incident")
    site: str = Field(description="Operational asset / site", json_schema_extra={"example": "Duliajan Production Installation"})
    location: Optional[str] = Field(default=None, json_schema_extra={"example": "Separator Station #4"})
    department: Optional[str] = Field(default=None, json_schema_extra={"example": "Mechanical Maintenance"})
    activity: Optional[str] = Field(default=None, json_schema_extra={"example": "Separator Vessel Inspection"})
    equipment: Optional[List[str]] = Field(default=None, json_schema_extra={"example": ["Gas Separator V-102"]})
    reporter_role: Optional[str] = Field(default=None, json_schema_extra={"example": "Lead Operator"})
    narrative: str = Field(
        min_length=10,
        description="Detailed free-text safety narrative",
        json_schema_extra={"example": "During maintenance, a contractor entered the tank to inspect an internal valve. Gas testing was not recorded, the entry permit had expired, and no attendant was positioned outside."}
    )


class ReportResponse(BaseModel):
    id: str
    report_id: str
    report_timestamp: datetime
    report_type: str
    site: str
    location: Optional[str] = None
    department: Optional[str] = None
    activity: Optional[str] = None
    equipment: Optional[List[str]] = None
    reporter_role: Optional[str] = None
    raw_text: str
    normalized_text: str
    quality_score: Optional[float] = None
    quality_grade: Optional[str] = None
    psif: Optional[PSIFSchema] = None
    life_saving_rules: List[IOGPRulePredictionSchema] = Field(default_factory=list)
    entities: Optional[EntitiesSchema] = None
    evidence_spans: List[EvidenceSpanSchema] = Field(default_factory=list)
    triggered_rules: List[str] = Field(default_factory=list)
    safety_reasoning: List[str] = Field(default_factory=list)
    exposure_fingerprint: Optional[str] = None
    review: Optional[ReviewResponse] = None
    corrective_actions: List[CorrectiveActionResponse] = Field(default_factory=list)
    model_version: str = "psif-v1.0"
    created_at: datetime


class ReportListItem(BaseModel):
    id: str
    report_id: str
    report_timestamp: datetime
    report_type: str
    site: str
    location: Optional[str] = None
    activity: Optional[str] = None
    priority: str
    psif_probability: float
    primary_rule: Optional[str] = None
    review_status: str
    quality_score: Optional[float] = None
    quality_grade: Optional[str] = None
    created_at: datetime


class ReportListResponse(BaseModel):
    total: int
    items: List[ReportListItem]


class BatchReportCreate(BaseModel):
    reports: List[ReportCreate] = Field(min_length=1, description="List of report payloads to batch ingest")


class BatchIngestItemResult(BaseModel):
    index: int
    report_id: Optional[str] = None
    status: str  # SUCCESS, REJECTED, DUPLICATE_WARNING
    quality_score: float
    quality_grade: str
    quality_issues: List[str] = Field(default_factory=list)
    duplicate_matches: List[Dict[str, Any]] = Field(default_factory=list)
    psif_probability: Optional[float] = None
    priority: Optional[str] = None
    primary_rule: Optional[str] = None
    error_message: Optional[str] = None


class BatchIngestResponse(BaseModel):
    total_processed: int
    successful_count: int
    failed_count: int
    duplicate_count: int
    average_quality_score: float
    grade_breakdown: Dict[str, int]
    items: List[BatchIngestItemResult]


class DataQualitySummaryResponse(BaseModel):
    total_reports: int
    average_quality_score: float
    grade_distribution: Dict[str, int]
    dimension_averages: Dict[str, float]
    common_issues: List[Dict[str, Any]]


class SimilaritySearchRequest(BaseModel):
    narrative: str = Field(min_length=3, description="Narrative or incident query text")
    top_k: int = Field(default=5, ge=1, le=20)
    min_score: float = Field(default=0.10, ge=0.0, le=1.0)


class SimilarPrecursorItem(BaseModel):
    report_id: str
    title: str
    site: str
    activity: str
    priority: str
    primary_rule: str
    secondary_rules: List[str] = Field(default_factory=list)
    similarity_score: float
    similarity_percentage: float
    shared_keywords: List[str] = Field(default_factory=list)
    snippet: str


class SimilaritySearchResponse(BaseModel):
    query_tokens_count: int
    total_matches: int
    similar_precursors: List[SimilarPrecursorItem]


class ReportSimilarityResponse(BaseModel):
    report_id: str
    site: str
    total_matches: int
    similar_precursors: List[SimilarPrecursorItem]

