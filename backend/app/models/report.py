"""
SQLAlchemy ORM Models for OIL-SIF Guardian.
Implements the database contract defined in docs/DATA_SCHEMA.md.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from backend.app.core.database import Base


def utc_now():
    return datetime.now(timezone.utc)


def generate_uuid():
    return str(uuid.uuid4())


class ReportModel(Base):
    __tablename__ = "reports"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    report_id = Column(String(64), unique=True, index=True, nullable=False)
    report_timestamp = Column(DateTime(timezone=True), default=utc_now, index=True)
    report_type = Column(String(32), default="near_miss", index=True)
    site = Column(String(128), index=True, nullable=False)
    location = Column(String(128), nullable=True)
    department = Column(String(128), nullable=True)
    activity = Column(String(128), nullable=True)
    equipment = Column(Text, nullable=True)  # JSON or comma-separated
    reporter_role = Column(String(64), nullable=True)
    raw_text = Column(Text, nullable=False)  # IMMUTABLE
    normalized_text = Column(Text, nullable=False)
    quality_score = Column(Float, nullable=True)
    quality_grade = Column(String(8), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    prediction = relationship("PredictionModel", back_populates="report", uselist=False, cascade="all, delete-orphan")
    entities = relationship("ReportEntityModel", back_populates="report", cascade="all, delete-orphan")
    review = relationship("ReviewModel", back_populates="report", uselist=False, cascade="all, delete-orphan")
    corrective_actions = relationship("CorrectiveActionModel", back_populates="report", cascade="all, delete-orphan")
    audit_events = relationship("AuditEventModel", back_populates="report", cascade="all, delete-orphan")


class PredictionModel(Base):
    __tablename__ = "predictions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    report_id = Column(String(36), ForeignKey("reports.id"), nullable=False, unique=True, index=True)
    psif_probability = Column(Float, nullable=False)
    priority = Column(String(16), nullable=False, index=True)  # HIGH, LOW, REVIEW
    confidence = Column(String(16), nullable=False)  # HIGH, MEDIUM, LOW
    calibration_factor = Column(Float, default=1.0)
    model_version = Column(String(32), nullable=False)
    reasoning_summary = Column(Text, nullable=True)
    exposure_fingerprint = Column(String(256), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    # Relationships
    report = relationship("ReportModel", back_populates="prediction")
    iogp_rules = relationship("IOGPPredictionModel", back_populates="prediction", cascade="all, delete-orphan")
    evidence_spans = relationship("EvidenceSpanModel", back_populates="prediction", cascade="all, delete-orphan")


class IOGPPredictionModel(Base):
    __tablename__ = "iogp_predictions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    prediction_id = Column(String(36), ForeignKey("predictions.id"), nullable=False, index=True)
    rule_name = Column(String(64), nullable=False, index=True)
    probability = Column(Float, nullable=False)
    is_primary = Column(Boolean, default=False)

    prediction = relationship("PredictionModel", back_populates="iogp_rules")


class ReportEntityModel(Base):
    __tablename__ = "report_entities"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    report_id = Column(String(36), ForeignKey("reports.id"), nullable=False, index=True)
    category = Column(String(32), nullable=False, index=True)  # hazard, energy, exposure, control, control_failure
    value = Column(String(128), nullable=False)

    report = relationship("ReportModel", back_populates="entities")


class EvidenceSpanModel(Base):
    __tablename__ = "evidence_spans"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    prediction_id = Column(String(36), ForeignKey("predictions.id"), nullable=False, index=True)
    text = Column(String(256), nullable=False)
    start_char = Column(Integer, nullable=False)
    end_char = Column(Integer, nullable=False)
    category = Column(String(32), nullable=False)

    prediction = relationship("PredictionModel", back_populates="evidence_spans")


class ReviewModel(Base):
    __tablename__ = "reviews"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    report_id = Column(String(36), ForeignKey("reports.id"), nullable=False, unique=True, index=True)
    status = Column(String(16), default="PENDING", index=True)  # PENDING, CONFIRMED, MODIFIED, REJECTED, ESCALATED
    decision = Column(String(32), nullable=True, default="CONFIRMED")
    reviewer_id = Column(String(64), nullable=True)
    reviewer_role = Column(String(64), nullable=True, default="HSE_OFFICER")
    final_psif_label = Column(String(16), nullable=True)
    final_primary_rule = Column(String(64), nullable=True)
    final_secondary_rules = Column(Text, nullable=True)  # JSON-encoded list
    barrier_failures = Column(Text, nullable=True)  # JSON-encoded list
    statutory_tags = Column(Text, nullable=True)  # JSON-encoded list
    override_reason_code = Column(String(64), nullable=True)
    veto_override_approved = Column(Boolean, default=False)
    senior_signoff_by = Column(String(64), nullable=True)
    recalibration_flag = Column(Boolean, default=False)
    reviewer_notes = Column(Text, nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    report = relationship("ReportModel", back_populates="review")


class CorrectiveActionModel(Base):
    __tablename__ = "corrective_actions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    report_id = Column(String(36), ForeignKey("reports.id"), nullable=False, index=True)
    action_id = Column(String(64), unique=True, nullable=False)
    title = Column(String(256), nullable=False)
    assigned_to = Column(String(128), nullable=False)
    due_date = Column(String(32), nullable=True)
    status = Column(String(32), default="OPEN", index=True)  # NOT_ASSIGNED, OPEN, IN_PROGRESS, VERIFIED_CLOSED
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    closed_at = Column(DateTime(timezone=True), nullable=True)
    verified_by = Column(String(128), nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    verification_notes = Column(Text, nullable=True)
    effectiveness_rating = Column(String(32), nullable=True, default="EFFECTIVE")  # EFFECTIVE, PARTIALLY_EFFECTIVE, RECURRENT_HAZARD

    report = relationship("ReportModel", back_populates="corrective_actions")


class AuditEventModel(Base):
    __tablename__ = "audit_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    report_id = Column(String(36), ForeignKey("reports.id"), nullable=True, index=True)
    action = Column(String(64), nullable=False)  # INGESTION, REVIEW, ACTION_CREATED, OVERRIDE
    actor_id = Column(String(64), default="SYSTEM")
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), default=utc_now)

    report = relationship("ReportModel", back_populates="audit_events")
