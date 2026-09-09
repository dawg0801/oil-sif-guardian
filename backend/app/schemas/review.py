"""
Pydantic Schemas for Human-in-the-Loop HSE Review & Calibration Workflow.
"""

from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class ReviewCreate(BaseModel):
    reviewer_id: str = Field(description="ID of HSE reviewing officer", json_schema_extra={"example": "HSE-OFFICER-742"})
    status: str = Field(description="CONFIRMED, MODIFIED, or REJECTED", json_schema_extra={"example": "CONFIRMED"})
    final_psif_label: Optional[str] = Field(default="HIGH", description="HIGH, LOW, or REVIEW")
    reviewer_notes: Optional[str] = Field(default=None, json_schema_extra={"example": "Validated high SIF precursor. Contractor work stopped."})


class ReviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    report_id: str
    status: str
    reviewer_id: Optional[str] = None
    final_psif_label: Optional[str] = None
    reviewer_notes: Optional[str] = None
    reviewed_at: Optional[datetime] = None


class AdjudicationRequest(BaseModel):
    report_id: str = Field(..., description="Unique report identifier e.g. OIL-2026-0001", json_schema_extra={"example": "OIL-2026-0001"})
    reviewer_id: str = Field(..., description="ID of reviewing officer", json_schema_extra={"example": "HSE-LEAD-804"})
    reviewer_role: str = Field(default="HSE_OFFICER", description="HSE_OFFICER, HSE_LEAD, SAFETY_MANAGER, PLANT_MANAGER, AUDITOR", json_schema_extra={"example": "HSE_LEAD"})
    decision: str = Field(default="CONFIRMED", description="CONFIRMED, MODIFIED, REJECTED, ESCALATED", json_schema_extra={"example": "CONFIRMED"})
    final_priority: str = Field(default="HIGH", description="HIGH, REVIEW, LOW", json_schema_extra={"example": "HIGH"})
    final_primary_rule: Optional[str] = Field(default=None, description="Corrected Primary IOGP Life-Saving Rule", json_schema_extra={"example": "Confined Space"})
    final_secondary_rules: Optional[List[str]] = Field(default_factory=list, description="Secondary IOGP Life-Saving Rules")
    barrier_failures: Optional[List[str]] = Field(default_factory=list, description="Barrier failures attributed by reviewer e.g. Physical, Administrative")
    statutory_tags: Optional[List[str]] = Field(default_factory=list, description="Statutory compliance tags e.g. OISD-105, DGMS")
    override_reason_code: Optional[str] = Field(default=None, description="Reason code if overriding AI verdict e.g. ENERGY_MITIGATED")
    reviewer_notes: str = Field(..., description="Technical rationale for HSE audit trail", json_schema_extra={"example": "Confined space entry verified without valid permit; contractor stopped."})
    senior_signoff_by: Optional[str] = Field(default=None, description="ID of Senior HSE Lead authorizing veto downgrade")
    create_corrective_action: Optional[bool] = Field(default=False, description="Whether to spawn a linked corrective action immediately")
    action_title: Optional[str] = Field(default=None, description="Title of corrective action if spawned")
    action_assignee: Optional[str] = Field(default=None, description="Assignee for corrective action")
    action_due_date: Optional[str] = Field(default=None, description="Due date YYYY-MM-DD")


class AdjudicationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    report_id: str
    status: str
    decision: str
    reviewer_id: str
    reviewer_role: str
    ai_priority: str
    final_priority: str
    is_veto_enforced: bool
    veto_override_approved: bool
    final_primary_rule: Optional[str] = None
    final_secondary_rules: List[str] = Field(default_factory=list)
    barrier_failures: List[str] = Field(default_factory=list)
    statutory_tags: List[str] = Field(default_factory=list)
    reviewer_notes: str
    reviewed_at: datetime
    action_id: Optional[str] = None
    audit_event_id: str
    recalibration_flag: bool = False


class PendingReviewItem(BaseModel):
    report_id: str
    site: str
    location: Optional[str] = None
    report_timestamp: datetime
    ai_priority: str
    psif_probability: float
    confidence: str
    primary_rule: Optional[str] = None
    secondary_rules: List[str] = Field(default_factory=list)
    is_veto_enforced: bool
    veto_rule_name: Optional[str] = None
    statutory_citation: Optional[str] = None
    raw_text: str
    review_status: str
    days_pending: int


class ReviewHistoryItem(BaseModel):
    report_id: str
    site: str
    ai_priority: str
    final_priority: str
    decision: str
    reviewer_id: str
    reviewer_role: str
    is_veto_enforced: bool
    veto_override_approved: bool
    final_primary_rule: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    reviewer_notes: Optional[str] = None
    override_reason_code: Optional[str] = None


class ReviewMetricsResponse(BaseModel):
    total_reports: int
    pending_count: int
    high_priority_pending: int
    adjudicated_count: int
    agreement_rate: float
    high_psif_agreement_rate: float
    priority_transitions: Dict[str, int]
    override_reasons: Dict[str, int]
    drift_status: str
    drift_alert_message: str
    reviewer_velocity_daily: float
    recommendations: List[str]
