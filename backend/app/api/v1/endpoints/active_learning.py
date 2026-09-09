"""
API Endpoints for Active Learning Prioritization & Guided Annotation (Phase 20).
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.models.report import AuditEventModel, ReportModel
from ml.active_learning.sampler import ActiveLearningCandidate, active_learning_sampler

router = APIRouter()


class ActiveLearningSubmitRequest(BaseModel):
    report_id: str = Field(description="Target incident report identifier")
    expert_id: str = Field(description="Name or ID of expert safety reviewer", json_schema_extra={"example": "Er. Rajesh Baruah"})
    is_psif: bool = Field(description="Definitive expert ground-truth label")
    priority: str = Field(description="HIGH, MEDIUM, LOW", json_schema_extra={"example": "HIGH"})
    primary_rule: Optional[str] = Field(default=None, description="IOGP 9 Life-Saving Rule")
    rationale: str = Field(description="Explanation for the high-information label")


class ActiveLearningStatsResponse(BaseModel):
    total_evaluated: int
    high_information_count: int
    mean_uncertainty_score: float
    model_rule_disagreement_count: int
    active_pool_size: int


@router.get("/queue", response_model=List[ActiveLearningCandidate])
def get_active_learning_queue(
    limit: int = Query(20, ge=1, le=100),
    min_score: float = Query(0.10, ge=0.0, le=1.0),
    db: Session = Depends(get_db)
):
    """
    Retrieves the prioritized active learning queue (Phase 20).
    Surfaces borderline samples (p ~ 0.50), model/rule conflicts, and rare equipment cases
    so that HSE safety experts spend time on high-information cases.
    """
    reports = db.query(ReportModel).order_by(ReportModel.created_at.desc()).limit(150).all()

    payloads = []
    for r in reports:
        prob = 0.50
        m_p = "LOW"
        r_p = "NONE"

        if r.prediction:
            prob = float(r.prediction.psif_probability)
            m_p = r.prediction.priority or "LOW"

        if r.review and r.review.status == "PENDING":
            r_p = r.review.decision or "NONE"

        text = getattr(r, "raw_text", "") or getattr(r, "normalized_text", "")
        site_name = getattr(r, "site", None) or getattr(r, "location", "Duliajan Gas Processing Station")

        payloads.append({
            "report_id": r.report_id,
            "narrative": text,
            "installation": site_name,
            "psif_probability": prob,
            "model_priority": m_p,
            "rule_priority": r_p,
            "entities": []
        })

    prioritized = active_learning_sampler.prioritize_reports(payloads, limit=limit)
    return [c for c in prioritized if c.information_value_score >= min_score]


@router.post("/submit", status_code=status.HTTP_201_CREATED)
def submit_active_learning_label(
    payload: ActiveLearningSubmitRequest,
    db: Session = Depends(get_db)
):
    """
    Ingests an expert-verified label from the active learning queue into the governed training pool.
    """
    report = db.query(ReportModel).filter(
        (ReportModel.id == payload.report_id) | (ReportModel.report_id == payload.report_id)
    ).first()

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report '{payload.report_id}' not found."
        )

    # Log audit trail
    db.add(AuditEventModel(
        report_id=report.id,
        action="ACTIVE_LEARNING_LABEL_SUBMITTED",
        actor_id=payload.expert_id,
        details=f"Expert label: is_psif={payload.is_psif}, priority={payload.priority}, rule={payload.primary_rule}. Rationale: {payload.rationale}"
    ))

    db.commit()

    return {
        "status": "ACCEPTED",
        "report_id": report.report_id,
        "expert_id": payload.expert_id,
        "final_priority": payload.priority,
        "message": "High-information label committed to governed active learning repository."
    }


@router.get("/stats", response_model=ActiveLearningStatsResponse)
def get_active_learning_stats(db: Session = Depends(get_db)):
    """
    Returns active learning pool statistics and uncertainty distribution.
    """
    reports = db.query(ReportModel).all()
    payloads = [
        {
            "report_id": r.report_id,
            "narrative": getattr(r, "raw_text", "") or getattr(r, "normalized_text", ""),
            "installation": getattr(r, "site", "Duliajan Gas Processing Station"),
            "psif_probability": float(r.prediction.psif_probability) if r.prediction else 0.50,
            "model_priority": r.prediction.priority if r.prediction else "LOW",
            "rule_priority": "NONE"
        }
        for r in reports
    ]

    prioritized = active_learning_sampler.prioritize_reports(payloads, limit=len(payloads))
    high_info = [c for c in prioritized if c.information_value_score >= 0.50]
    disagreements = [c for c in prioritized if c.disagreement]
    avg_uncertainty = (
        sum(c.uncertainty_score for c in prioritized) / len(prioritized)
        if prioritized else 0.0
    )

    return ActiveLearningStatsResponse(
        total_evaluated=len(reports),
        high_information_count=len(high_info),
        mean_uncertainty_score=round(avg_uncertainty, 4),
        model_rule_disagreement_count=len(disagreements),
        active_pool_size=len(high_info)
    )
