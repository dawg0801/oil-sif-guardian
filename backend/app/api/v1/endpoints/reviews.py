"""
API Router for HSE Human-in-the-Loop Review & Calibration Operations.
Enforces Rule 2 Statutory Safety Guardrails (Zero-Tolerance Veto Invariant).
"""

import json
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.models.report import AuditEventModel, CorrectiveActionModel, PredictionModel, ReportModel, ReviewModel
from backend.app.schemas.review import (
    AdjudicationRequest,
    AdjudicationResponse,
    PendingReviewItem,
    ReviewCreate,
    ReviewHistoryItem,
    ReviewMetricsResponse,
    ReviewResponse,
)
from ml.annotation.adjudicator import HITLAdjudicationEngine
from rules.safety.deterministic_rules import DeterministicSafetyRuleEngine

router = APIRouter()
rule_engine = DeterministicSafetyRuleEngine()


@router.post("/adjudicate", response_model=AdjudicationResponse)
def adjudicate_report(payload: AdjudicationRequest, db: Session = Depends(get_db)):
    """
    Submits an HSE human-in-the-loop expert adjudication verdict.
    Strictly enforces Rule 2: Deterministic safety veto cannot be downgraded
    without Senior HSE Lead authority and at least 30 characters of rationale.
    """
    report = db.query(ReportModel).filter(
        (ReportModel.id == payload.report_id) | (ReportModel.report_id == payload.report_id)
    ).first()

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report '{payload.report_id}' not found."
        )

    # Evaluate deterministic veto on narrative
    rule_eval = rule_engine.evaluate(report.raw_text)
    is_veto_enforced = bool(rule_eval.get("mandatory_high_psif", False))

    ai_priority = "REVIEW"
    if report.prediction:
        ai_priority = str(report.prediction.priority).upper()

    # Validate against statutory invariant
    try:
        val_res = HITLAdjudicationEngine.validate_adjudication(
            ai_priority=ai_priority,
            is_veto_enforced=is_veto_enforced,
            requested_priority=payload.final_priority,
            decision=payload.decision,
            reviewer_role=payload.reviewer_role,
            reviewer_notes=payload.reviewer_notes,
            senior_signoff_by=payload.senior_signoff_by,
            override_reason_code=payload.override_reason_code
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )

    # Get or create review record
    review = report.review
    if not review:
        review = ReviewModel(report_id=report.id)
        db.add(review)

    now_utc = datetime.now(timezone.utc)
    review.status = val_res["decision"]
    review.decision = val_res["decision"]
    review.reviewer_id = payload.reviewer_id
    review.reviewer_role = val_res["reviewer_role"]
    review.final_psif_label = val_res["final_priority"]
    review.final_primary_rule = payload.final_primary_rule
    review.final_secondary_rules = json.dumps(payload.final_secondary_rules or [])
    review.barrier_failures = json.dumps(payload.barrier_failures or [])
    review.statutory_tags = json.dumps(payload.statutory_tags or [])
    review.override_reason_code = val_res["override_reason_code"]
    review.veto_override_approved = val_res["veto_override_approved"]
    review.senior_signoff_by = payload.senior_signoff_by
    review.recalibration_flag = val_res["recalibration_flag"]
    review.reviewer_notes = payload.reviewer_notes
    review.reviewed_at = now_utc

    # Optional auto-creation of corrective action
    action_id = None
    if payload.create_corrective_action:
        act_uuid = f"ACT-{uuid.uuid4().hex[:8].upper()}"
        act_title = payload.action_title or f"Adjudicated Corrective Action for {report.report_id}"
        act_assignee = payload.action_assignee or "HSE Field Superintendent"
        action = CorrectiveActionModel(
            report_id=report.id,
            action_id=act_uuid,
            title=act_title,
            assigned_to=act_assignee,
            due_date=payload.action_due_date,
            status="OPEN",
            notes=f"Created via HITL Adjudication by {payload.reviewer_id} ({payload.reviewer_role}). Notes: {payload.reviewer_notes}"
        )
        db.add(action)
        action_id = act_uuid

    # Create immutable audit log entry
    audit_uuid = str(uuid.uuid4())
    audit_event = AuditEventModel(
        id=audit_uuid,
        report_id=report.id,
        action="HITL_ADJUDICATION",
        actor_id=f"{payload.reviewer_id} ({val_res['reviewer_role']})",
        details=(
            f"Adjudication Decision: {val_res['decision']}. Final Priority: {val_res['final_priority']}. "
            f"AI Priority: {ai_priority}. Veto Enforced: {is_veto_enforced}. "
            f"Veto Override Approved: {val_res['veto_override_approved']}. "
            f"Reason: {val_res['override_reason_code']}. Rationale: {payload.reviewer_notes}"
        ),
        timestamp=now_utc
    )
    db.add(audit_event)

    db.commit()
    db.refresh(review)

    return AdjudicationResponse(
        report_id=report.report_id,
        status=review.status,
        decision=review.decision or review.status,
        reviewer_id=review.reviewer_id,
        reviewer_role=review.reviewer_role or "HSE_OFFICER",
        ai_priority=ai_priority,
        final_priority=review.final_psif_label or ai_priority,
        is_veto_enforced=is_veto_enforced,
        veto_override_approved=bool(review.veto_override_approved),
        final_primary_rule=review.final_primary_rule,
        final_secondary_rules=payload.final_secondary_rules or [],
        barrier_failures=payload.barrier_failures or [],
        statutory_tags=payload.statutory_tags or [],
        reviewer_notes=review.reviewer_notes or "",
        reviewed_at=review.reviewed_at or now_utc,
        action_id=action_id,
        audit_event_id=audit_uuid,
        recalibration_flag=bool(review.recalibration_flag)
    )


@router.get("/pending", response_model=List[PendingReviewItem])
def get_pending_reviews(
    priority: Optional[str] = Query(None, description="Filter by AI priority (HIGH, REVIEW, LOW)"),
    site: Optional[str] = Query(None, description="Filter by site"),
    veto_only: bool = Query(False, description="Filter only reports triggering deterministic veto"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Returns reports awaiting HSE expert adjudication, enriched with
    AI triage confidence, deterministic veto tags, and statutory citations.
    """
    query = db.query(ReportModel).outerjoin(ReviewModel, ReportModel.id == ReviewModel.report_id)
    query = query.filter(
        (ReviewModel.status == "PENDING") | (ReviewModel.id == None) | (ReviewModel.reviewed_at == None)
    )

    if site:
        query = query.filter(ReportModel.site == site)

    reports = query.order_by(ReportModel.created_at.desc()).all()
    now_utc = datetime.now(timezone.utc)

    items: List[PendingReviewItem] = []
    for r in reports:
        prio = "REVIEW"
        prob = 0.50
        conf = "MEDIUM"
        prim_rule = None
        sec_rules: List[str] = []

        if r.prediction:
            prio = r.prediction.priority
            prob = r.prediction.psif_probability
            conf = r.prediction.confidence
            if r.prediction.iogp_rules:
                for rule_item in r.prediction.iogp_rules:
                    if rule_item.is_primary:
                        prim_rule = rule_item.rule_name
                    else:
                        sec_rules.append(rule_item.rule_name)

        rule_eval = rule_engine.evaluate(r.raw_text)
        is_veto = bool(rule_eval.get("mandatory_high_psif", False))
        veto_rule_name = rule_eval.get("triggered_rules", [None])[0] if is_veto else None
        statutory_citation = None
        if is_veto and rule_eval.get("definitions"):
            statutory_citation = rule_eval["definitions"][0].get("statutory_citation")

        # Filters
        if priority and prio.upper() != priority.upper():
            continue
        if veto_only and not is_veto:
            continue

        created_dt = r.created_at
        if created_dt.tzinfo is None:
            created_dt = created_dt.replace(tzinfo=timezone.utc)
        days_pending = max(0, (now_utc - created_dt).days)

        items.append(PendingReviewItem(
            report_id=r.report_id,
            site=r.site,
            location=r.location,
            report_timestamp=r.report_timestamp,
            ai_priority=prio,
            psif_probability=prob,
            confidence=conf,
            primary_rule=prim_rule,
            secondary_rules=sec_rules,
            is_veto_enforced=is_veto,
            veto_rule_name=veto_rule_name,
            statutory_citation=statutory_citation,
            raw_text=r.raw_text,
            review_status="PENDING",
            days_pending=days_pending
        ))

    # Sort: Veto items and HIGH priority first, then days pending descending
    items.sort(key=lambda x: (not x.is_veto_enforced, 0 if x.ai_priority == 'HIGH' else 1 if x.ai_priority == 'REVIEW' else 2, -x.days_pending))
    return items[offset:offset + limit]


@router.get("/history", response_model=List[ReviewHistoryItem])
def get_review_history(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Returns historical completed adjudications with human vs. AI comparison.
    """
    query = db.query(ReportModel).join(ReviewModel, ReportModel.id == ReviewModel.report_id)
    query = query.filter(ReviewModel.reviewed_at != None, ReviewModel.status != "PENDING")
    reports = query.order_by(ReviewModel.reviewed_at.desc()).offset(offset).limit(limit).all()

    history: List[ReviewHistoryItem] = []
    for r in reports:
        ai_prio = r.prediction.priority if r.prediction else "REVIEW"
        rev = r.review
        history.append(ReviewHistoryItem(
            report_id=r.report_id,
            site=r.site,
            ai_priority=ai_prio,
            final_priority=rev.final_psif_label or ai_prio,
            decision=rev.decision or rev.status,
            reviewer_id=rev.reviewer_id or "UNKNOWN",
            reviewer_role=rev.reviewer_role or "HSE_OFFICER",
            is_veto_enforced=bool(rule_engine.evaluate(r.raw_text).get("mandatory_high_psif", False)),
            veto_override_approved=bool(rev.veto_override_approved),
            final_primary_rule=rev.final_primary_rule,
            reviewed_at=rev.reviewed_at,
            reviewer_notes=rev.reviewer_notes,
            override_reason_code=rev.override_reason_code
        ))

    return history


@router.get("/metrics", response_model=ReviewMetricsResponse)
def get_review_metrics(db: Session = Depends(get_db)):
    """
    Computes Human-AI agreement metrics, priority confusion matrix,
    drift detection status, and calibration recommendations.
    """
    total_reports = db.query(ReportModel).count()
    pending_count = db.query(ReportModel).outerjoin(
        ReviewModel, ReportModel.id == ReviewModel.report_id
    ).filter(
        (ReviewModel.status == "PENDING") | (ReviewModel.id == None) | (ReviewModel.reviewed_at == None)
    ).count()

    high_pending_count = db.query(ReportModel).outerjoin(
        ReviewModel, ReportModel.id == ReviewModel.report_id
    ).join(
        PredictionModel, ReportModel.id == PredictionModel.report_id
    ).filter(
        (ReviewModel.status == "PENDING") | (ReviewModel.id == None) | (ReviewModel.reviewed_at == None),
        PredictionModel.priority == "HIGH"
    ).count()

    # Adjudicated reports
    adjudicated_reports = db.query(ReportModel).join(
        ReviewModel, ReportModel.id == ReviewModel.report_id
    ).filter(
        ReviewModel.reviewed_at != None,
        ReviewModel.status != "PENDING"
    ).all()

    adjudicated_records = []
    for r in adjudicated_reports:
        ai_prio = r.prediction.priority if r.prediction else "REVIEW"
        adjudicated_records.append({
            "ai_priority": ai_prio,
            "final_priority": r.review.final_psif_label or ai_prio,
            "decision": r.review.decision or r.review.status,
            "override_reason_code": r.review.override_reason_code,
            "is_veto_override": r.review.veto_override_approved,
            "reviewed_at": r.review.reviewed_at
        })

    metrics = HITLAdjudicationEngine.compute_metrics(
        total_reports=total_reports,
        pending_count=pending_count,
        high_pending_count=high_pending_count,
        adjudicated_records=adjudicated_records
    )

    return ReviewMetricsResponse(**metrics)


# Legacy endpoint preserved for backward compatibility
@router.post("/{report_id}/review", response_model=ReviewResponse)
def submit_review(report_id: str, payload: ReviewCreate, db: Session = Depends(get_db)):
    """
    Legacy review endpoint preserved for backward compatibility.
    """
    report = db.query(ReportModel).filter(
        (ReportModel.id == report_id) | (ReportModel.report_id == report_id)
    ).first()

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report '{report_id}' not found."
        )

    review = report.review
    if not review:
        review = ReviewModel(report_id=report.id)
        db.add(review)

    review.reviewer_id = payload.reviewer_id
    review.status = payload.status.upper()
    review.decision = payload.status.upper()
    review.final_psif_label = payload.final_psif_label.upper() if payload.final_psif_label else review.final_psif_label
    review.reviewer_notes = payload.reviewer_notes
    review.reviewed_at = datetime.now(timezone.utc)

    db.add(AuditEventModel(
        report_id=report.id,
        action="HSE_HUMAN_REVIEW",
        actor_id=payload.reviewer_id,
        details=f"Review status set to {review.status}. Final PSIF: {review.final_psif_label}. Notes: {review.reviewer_notes}"
    ))

    db.commit()
    db.refresh(review)

    return ReviewResponse(
        report_id=report.report_id,
        status=review.status,
        reviewer_id=review.reviewer_id,
        final_psif_label=review.final_psif_label,
        reviewer_notes=review.reviewer_notes,
        reviewed_at=review.reviewed_at
    )
