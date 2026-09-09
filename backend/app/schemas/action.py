"""
Pydantic Schemas for Corrective Actions Management.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class CorrectiveActionCreate(BaseModel):
    title: str = Field(description="Action summary", json_schema_extra={"example": "Audit gas testing logs & conduct safety stand-down"})
    assigned_to: str = Field(description="Responsible person / role", json_schema_extra={"example": "Field Operations Superintendent"})
    due_date: Optional[str] = Field(default=None, description="Target closure date (YYYY-MM-DD)", json_schema_extra={"example": "2026-09-15"})
    status: Optional[str] = Field(default="OPEN", description="OPEN, IN_PROGRESS, VERIFIED_CLOSED")
    notes: Optional[str] = Field(default=None)


class CorrectiveActionUpdate(BaseModel):
    title: Optional[str] = None
    assigned_to: Optional[str] = None
    due_date: Optional[str] = None
    status: Optional[str] = Field(default=None, description="OPEN, IN_PROGRESS, VERIFIED_CLOSED")
    notes: Optional[str] = None
    verification_notes: Optional[str] = None
    verified_by: Optional[str] = None


class CorrectiveActionVerifyRequest(BaseModel):
    verified_by: str = Field(description="Name or ID of verifying HSE officer", json_schema_extra={"example": "Er. Rajesh Baruah (Chief Safety Officer)"})
    verification_notes: str = Field(description="Audit observations and evidence of closure", json_schema_extra={"example": "Inspected permit log and field calibration records. Attendant logbook fully updated."})
    effectiveness_rating: Optional[str] = Field(default="EFFECTIVE", description="EFFECTIVE, PARTIALLY_EFFECTIVE, RECURRENT_HAZARD")


class CorrectiveActionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    action_id: str
    report_id: str
    title: str
    assigned_to: str
    due_date: Optional[str] = None
    status: str
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    verified_by: Optional[str] = None
    verified_at: Optional[datetime] = None
    verification_notes: Optional[str] = None
    effectiveness_rating: Optional[str] = "EFFECTIVE"


class CorrectiveActionStatsResponse(BaseModel):
    total_actions: int
    open_count: int
    in_progress_count: int
    verified_closed_count: int
    overdue_count: int
    closure_rate: float


class PrecursorRecurrenceRecord(BaseModel):
    action_id: str
    report_id: str
    action_title: str
    installation: str
    closed_at: Optional[str] = None
    verified_at: Optional[str] = None
    recurrence_count: int
    recurring_report_ids: list[str] = []
    recurrence_hazard: Optional[str] = None
    recurrence_status: str  # NO_RECURRENCE, RECURRENCE_DETECTED, CRITICAL_DEGRADATION
    days_to_first_recurrence: Optional[int] = None


class RecurrenceAnalyticsResponse(BaseModel):
    total_closed_actions: int
    actions_with_recurrence: int
    recurrence_rate: float
    barrier_degradation_alarm: bool
    time_window_days: int
    installation_breakdown: dict[str, int]
    recurrence_records: list[PrecursorRecurrenceRecord]

