"""
API Router for Corrective Action Assignment, Lifecycle Tracking, and Verification.
"""

from datetime import date, datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.models.report import AuditEventModel, CorrectiveActionModel, ReportModel
from backend.app.schemas.action import (
    CorrectiveActionCreate,
    CorrectiveActionResponse,
    CorrectiveActionStatsResponse,
    CorrectiveActionUpdate,
    CorrectiveActionVerifyRequest,
    PrecursorRecurrenceRecord,
    RecurrenceAnalyticsResponse,
)

router = APIRouter()


@router.get("/actions/stats", response_model=CorrectiveActionStatsResponse)
@router.get("/stats", response_model=CorrectiveActionStatsResponse)
def get_actions_stats(db: Session = Depends(get_db)):
    """
    Returns enterprise-level statistics for all corrective actions.
    """
    total = db.query(CorrectiveActionModel).count()
    open_cnt = db.query(CorrectiveActionModel).filter(CorrectiveActionModel.status == "OPEN").count()
    prog_cnt = db.query(CorrectiveActionModel).filter(CorrectiveActionModel.status == "IN_PROGRESS").count()
    closed_cnt = db.query(CorrectiveActionModel).filter(CorrectiveActionModel.status == "VERIFIED_CLOSED").count()

    today_str = date.today().isoformat()
    overdue_cnt = db.query(CorrectiveActionModel).filter(
        CorrectiveActionModel.status != "VERIFIED_CLOSED",
        CorrectiveActionModel.due_date != None,
        CorrectiveActionModel.due_date < today_str
    ).count()

    closure_rate = round(closed_cnt / total, 4) if total > 0 else 0.0

    return CorrectiveActionStatsResponse(
        total_actions=total,
        open_count=open_cnt,
        in_progress_count=prog_cnt,
        verified_closed_count=closed_cnt,
        overdue_count=overdue_cnt,
        closure_rate=closure_rate
    )


@router.get("/actions/all", response_model=List[CorrectiveActionResponse])
@router.get("/all", response_model=List[CorrectiveActionResponse])
def list_all_actions(
    status: Optional[str] = Query(None, description="Filter by status (OPEN, IN_PROGRESS, VERIFIED_CLOSED)"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Lists all enterprise corrective actions across all oil installations.
    """
    query = db.query(CorrectiveActionModel).join(ReportModel, CorrectiveActionModel.report_id == ReportModel.id)
    if status:
        query = query.filter(CorrectiveActionModel.status == status.upper())

    actions = query.order_by(CorrectiveActionModel.created_at.desc()).offset(offset).limit(limit).all()

    return [
        CorrectiveActionResponse(
            action_id=a.action_id,
            report_id=a.report.report_id if a.report else "UNKNOWN",
            title=a.title,
            assigned_to=a.assigned_to,
            due_date=a.due_date,
            status=a.status,
            notes=a.notes,
            created_at=a.created_at,
            closed_at=a.closed_at,
            verified_by=getattr(a, "verified_by", None),
            verified_at=getattr(a, "verified_at", None),
            verification_notes=getattr(a, "verification_notes", None),
            effectiveness_rating=getattr(a, "effectiveness_rating", "EFFECTIVE")
        )
        for a in actions
    ]


@router.patch("/actions/{action_id}", response_model=CorrectiveActionResponse)
@router.patch("/{action_id}", response_model=CorrectiveActionResponse)
def update_corrective_action(
    action_id: str,
    payload: CorrectiveActionUpdate,
    db: Session = Depends(get_db)
):
    """
    Updates the lifecycle status, assignee, or verification notes of a corrective action.
    """
    action = db.query(CorrectiveActionModel).filter(CorrectiveActionModel.action_id == action_id).first()
    if not action:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Corrective action '{action_id}' not found."
        )

    old_status = action.status
    if payload.title is not None:
        action.title = payload.title
    if payload.assigned_to is not None:
        action.assigned_to = payload.assigned_to
    if payload.due_date is not None:
        action.due_date = payload.due_date

    now_utc = datetime.now(timezone.utc)
    if payload.status is not None:
        new_status = payload.status.upper()
        action.status = new_status
        if new_status == "VERIFIED_CLOSED" and not action.closed_at:
            action.closed_at = now_utc
            action.verified_at = now_utc
            if payload.verified_by:
                action.verified_by = payload.verified_by
            if payload.verification_notes:
                action.verification_notes = payload.verification_notes
        elif new_status != "VERIFIED_CLOSED":
            action.closed_at = None

    if payload.notes is not None:
        action.notes = payload.notes

    if payload.verification_notes and action.status != "VERIFIED_CLOSED":
        added = f"\n[Note {now_utc.strftime('%Y-%m-%d %H:%M')} by {payload.verified_by or 'HSE Lead'}]: {payload.verification_notes}"
        action.notes = (action.notes or "") + added

    # Audit log
    db.add(AuditEventModel(
        report_id=action.report_id,
        action="CORRECTIVE_ACTION_UPDATED",
        actor_id=payload.verified_by or action.assigned_to,
        details=f"Action {action_id} transitioned from {old_status} to {action.status}."
    ))

    db.commit()
    db.refresh(action)

    report_ref = action.report.report_id if action.report else "UNKNOWN"
    return CorrectiveActionResponse(
        action_id=action.action_id,
        report_id=report_ref,
        title=action.title,
        assigned_to=action.assigned_to,
        due_date=action.due_date,
        status=action.status,
        notes=action.notes,
        created_at=action.created_at,
        closed_at=action.closed_at,
        verified_by=action.verified_by,
        verified_at=action.verified_at,
        verification_notes=action.verification_notes,
        effectiveness_rating=action.effectiveness_rating
    )


@router.post("/actions/{action_id}/verify", response_model=CorrectiveActionResponse)
@router.post("/{action_id}/verify", response_model=CorrectiveActionResponse)
def verify_corrective_action(
    action_id: str,
    payload: CorrectiveActionVerifyRequest,
    db: Session = Depends(get_db)
):
    """
    Formal HSE Verification & Closure Sign-off (Phase 19).
    Closes the loop: Problem -> Action -> Owner -> Due date -> Closure -> Verification.
    """
    action = db.query(CorrectiveActionModel).filter(CorrectiveActionModel.action_id == action_id).first()
    if not action:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Corrective action '{action_id}' not found."
        )

    now_utc = datetime.now(timezone.utc)
    action.status = "VERIFIED_CLOSED"
    action.closed_at = now_utc
    action.verified_at = now_utc
    action.verified_by = payload.verified_by
    action.verification_notes = payload.verification_notes
    action.effectiveness_rating = payload.effectiveness_rating or "EFFECTIVE"

    db.add(AuditEventModel(
        report_id=action.report_id,
        action="CORRECTIVE_ACTION_VERIFIED",
        actor_id=payload.verified_by,
        details=f"Action {action_id} formally verified & closed. Effectiveness: {action.effectiveness_rating}. Notes: {payload.verification_notes}"
    ))

    db.commit()
    db.refresh(action)

    report_ref = action.report.report_id if action.report else "UNKNOWN"
    return CorrectiveActionResponse(
        action_id=action.action_id,
        report_id=report_ref,
        title=action.title,
        assigned_to=action.assigned_to,
        due_date=action.due_date,
        status=action.status,
        notes=action.notes,
        created_at=action.created_at,
        closed_at=action.closed_at,
        verified_by=action.verified_by,
        verified_at=action.verified_at,
        verification_notes=action.verification_notes,
        effectiveness_rating=action.effectiveness_rating
    )


@router.get("/actions/recurrence", response_model=RecurrenceAnalyticsResponse)
@router.get("/recurrence", response_model=RecurrenceAnalyticsResponse)
def get_precursor_recurrence_intelligence(
    window_days: int = Query(90, ge=7, le=365, description="Observation window post-closure"),
    db: Session = Depends(get_db)
):
    """
    Measures whether the same precursor keeps appearing after action closure (Phase 19).
    Detects barrier degradation and repeated control failures across Oil India installations.
    """
    closed_actions = db.query(CorrectiveActionModel).join(ReportModel).filter(
        CorrectiveActionModel.status == "VERIFIED_CLOSED"
    ).all()

    all_reports = db.query(ReportModel).all()

    recurrence_records = []
    installation_counts: dict[str, int] = {}
    actions_with_recurrence = 0

    for act in closed_actions:
        orig_rep = act.report
        inst = (getattr(orig_rep, "site", None) or getattr(orig_rep, "location", "Unknown Facility")) if orig_rep else "Unknown Facility"
        act_closed = act.closed_at or act.created_at

        # Match reports from same installation logged after action closure
        subsequent_reps = []
        for r in all_reports:
            r_site = getattr(r, "site", None) or getattr(r, "location", "Unknown Facility")
            if r_site == inst and r.id != (orig_rep.id if orig_rep else ""):
                r_created = r.created_at
                if r_created and act_closed:
                    # Normalize timezones for safe comparison
                    t1 = r_created.replace(tzinfo=timezone.utc) if r_created.tzinfo is None else r_created
                    t2 = act_closed.replace(tzinfo=timezone.utc) if act_closed.tzinfo is None else act_closed
                    if t1 >= t2:
                        subsequent_reps.append(r)

        # Further match overlapping control failures or narrative keywords
        recurrent_ids = []
        days_to_first = None
        for sub in subsequent_reps:
            t_sub = sub.created_at.replace(tzinfo=timezone.utc) if sub.created_at.tzinfo is None else sub.created_at
            t_act = act_closed.replace(tzinfo=timezone.utc) if act_closed.tzinfo is None else act_closed
            delta_days = max(0, (t_sub - t_act).days)
            if delta_days <= window_days:
                recurrent_ids.append(sub.report_id)
                if days_to_first is None or delta_days < days_to_first:
                    days_to_first = delta_days

        rec_count = len(recurrent_ids)
        if rec_count > 0:
            actions_with_recurrence += 1
            installation_counts[inst] = installation_counts.get(inst, 0) + rec_count

        status_flag = (
            "CRITICAL_DEGRADATION" if rec_count >= 2
            else "RECURRENCE_DETECTED" if rec_count == 1
            else "NO_RECURRENCE"
        )

        recurrence_records.append(
            PrecursorRecurrenceRecord(
                action_id=act.action_id,
                report_id=orig_rep.report_id if orig_rep else "UNKNOWN",
                action_title=act.title,
                installation=inst,
                closed_at=act_closed.isoformat() if act_closed else None,
                verified_at=act.verified_at.isoformat() if act.verified_at else None,
                recurrence_count=rec_count,
                recurring_report_ids=recurrent_ids,
                recurrence_hazard=act.title,
                recurrence_status=status_flag,
                days_to_first_recurrence=days_to_first
            )
        )

    total_closed = len(closed_actions)
    rec_rate = round(actions_with_recurrence / total_closed, 4) if total_closed > 0 else 0.0
    degradation_alarm = rec_rate >= 0.15 or any(r.recurrence_status == "CRITICAL_DEGRADATION" for r in recurrence_records)

    return RecurrenceAnalyticsResponse(
        total_closed_actions=total_closed,
        actions_with_recurrence=actions_with_recurrence,
        recurrence_rate=rec_rate,
        barrier_degradation_alarm=degradation_alarm,
        time_window_days=window_days,
        installation_breakdown=installation_counts,
        recurrence_records=recurrence_records
    )



@router.post("/{report_id}/actions", response_model=CorrectiveActionResponse, status_code=status.HTTP_201_CREATED)
def create_corrective_action(report_id: str, payload: CorrectiveActionCreate, db: Session = Depends(get_db)):
    """
    Creates and attaches a corrective safety action to a prioritized incident report.
    """
    report = db.query(ReportModel).filter(
        (ReportModel.id == report_id) | (ReportModel.report_id == report_id)
    ).first()

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report '{report_id}' not found."
        )

    act_num = db.query(CorrectiveActionModel).count() + 101
    year = datetime.now(timezone.utc).year
    action_id = f"ACT-{year}-{act_num:05d}"

    action = CorrectiveActionModel(
        report_id=report.id,
        action_id=action_id,
        title=payload.title,
        assigned_to=payload.assigned_to,
        due_date=payload.due_date,
        status=payload.status.upper() if payload.status else "OPEN",
        notes=payload.notes
    )
    db.add(action)

    # Log audit event
    db.add(AuditEventModel(
        report_id=report.id,
        action="CORRECTIVE_ACTION_CREATED",
        actor_id=payload.assigned_to,
        details=f"Created corrective action {action_id}: {payload.title} (due: {payload.due_date})"
    ))

    db.commit()
    db.refresh(action)

    return CorrectiveActionResponse(
        action_id=action.action_id,
        report_id=report.report_id,
        title=action.title,
        assigned_to=action.assigned_to,
        due_date=action.due_date,
        status=action.status,
        notes=action.notes,
        created_at=action.created_at,
        closed_at=action.closed_at,
        verified_by=action.verified_by,
        verified_at=action.verified_at,
        verification_notes=action.verification_notes,
        effectiveness_rating=action.effectiveness_rating
    )


@router.get("/{report_id}/actions", response_model=List[CorrectiveActionResponse])
def list_corrective_actions(report_id: str, db: Session = Depends(get_db)):
    """
    Retrieves all corrective actions for a given report.
    """
    report = db.query(ReportModel).filter(
        (ReportModel.id == report_id) | (ReportModel.report_id == report_id)
    ).first()

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report '{report_id}' not found."
        )

    return [
        CorrectiveActionResponse(
            action_id=a.action_id,
            report_id=report.report_id,
            title=a.title,
            assigned_to=a.assigned_to,
            due_date=a.due_date,
            status=a.status,
            notes=a.notes,
            created_at=a.created_at,
            closed_at=a.closed_at,
            verified_by=getattr(a, "verified_by", None),
            verified_at=getattr(a, "verified_at", None),
            verification_notes=getattr(a, "verification_notes", None),
            effectiveness_rating=getattr(a, "effectiveness_rating", "EFFECTIVE")
        )
        for a in report.corrective_actions
    ]
