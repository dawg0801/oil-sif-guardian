"""
OIL-SIF Guardian — Ingestion & Normalization Service.
Coordinates text normalization, PII redaction, quality scoring, duplicate detection,
and AI triage for single, batch, and CSV dataset uploads.
"""

import csv
import io
import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from backend.app.models.report import (
    AuditEventModel,
    EvidenceSpanModel,
    IOGPPredictionModel,
    PredictionModel,
    ReportEntityModel,
    ReportModel,
    ReviewModel,
)
from backend.app.schemas.report import (
    BatchIngestItemResult,
    BatchIngestResponse,
    DataQualitySummaryResponse,
    ReportCreate,
)
from backend.app.services.triage_service import triage_service
from ml.preprocessing.duplicate_detector import DuplicateDetector
from ml.preprocessing.normalizer import TextNormalizer
from ml.preprocessing.pii_masker import PIIMasker
from ml.preprocessing.quality_scorer import DataQualityScorer, QualityScoreResult


class IngestionService:
    def __init__(self):
        self.normalizer = TextNormalizer()
        self.pii_masker = PIIMasker()
        self.quality_scorer = DataQualityScorer()
        self.duplicate_detector = DuplicateDetector()

    def process_single(
        self,
        payload: ReportCreate,
        db: Session,
        existing_reports_cache: Optional[List[Dict[str, Any]]] = None,
        commit: bool = True
    ) -> Tuple[ReportModel, BatchIngestItemResult]:
        """
        Executes complete ingestion pipeline for a single report:
        1. Text normalization & abbreviation expansion
        2. PII identification & redaction
        3. Quality & completeness scoring
        4. Duplicate & near-duplicate detection
        5. Safety triage & entity extraction
        6. Database persistence with audit trail
        """
        raw_text = payload.narrative
        # 1. Normalization
        normalized = self.normalizer.normalize(raw_text)

        # 2. PII Masking
        masked_text, pii_matches = self.pii_masker.mask_pii(normalized)

        # 3. Quality Scoring
        metadata_dict = {
            "location": payload.location,
            "operational_area": payload.activity,
            "department": payload.department,
            "equipment_involved": ", ".join(payload.equipment) if payload.equipment else None,
            "site": payload.site,
            "reporter_role": payload.reporter_role
        }
        quality_res: QualityScoreResult = self.quality_scorer.score_report(masked_text, metadata_dict)

        # 4. Duplicate Detection
        if existing_reports_cache is None:
            # Query recent reports for duplicate checking
            recent = db.query(ReportModel.id, ReportModel.report_id, ReportModel.normalized_text, ReportModel.location).order_by(ReportModel.report_timestamp.desc()).limit(200).all()
            existing_reports_cache = [
                {"id": r.report_id, "raw_text": r.normalized_text, "location": r.location}
                for r in recent
            ]

        duplicates = self.duplicate_detector.find_duplicates(
            new_text=masked_text,
            metadata=metadata_dict,
            existing_reports=existing_reports_cache
        )

        # 5. Execute Triage Engine
        triage_result = triage_service.triage(
            narrative=masked_text,
            activity=payload.activity or "Maintenance"
        )

        # 6. Generate canonical Report ID
        rep_num = db.query(ReportModel).count() + 1001
        year = datetime.now(timezone.utc).year
        report_id = f"OIL-{year}-REP-{rep_num:06d}"

        # 7. Create Models
        equip_json = json.dumps(payload.equipment) if payload.equipment else None
        report = ReportModel(
            report_id=report_id,
            report_type=payload.report_type,
            site=payload.site,
            location=payload.location,
            department=payload.department,
            activity=payload.activity,
            equipment=equip_json,
            reporter_role=payload.reporter_role,
            raw_text=raw_text,  # IMMUTABLE
            normalized_text=masked_text,
            quality_score=quality_res.score,
            quality_grade=quality_res.grade
        )
        db.add(report)
        db.flush()

        pred = PredictionModel(
            report_id=report.id,
            psif_probability=triage_result.psif.probability,
            priority=triage_result.psif.priority,
            confidence=triage_result.psif.confidence,
            calibration_factor=triage_result.psif.calibration_factor or 1.0,
            model_version=triage_result.model_version,
            reasoning_summary=json.dumps(triage_result.safety_reasoning),
            exposure_fingerprint=triage_result.exposure_fingerprint
        )
        db.add(pred)
        db.flush()

        for r in triage_result.life_saving_rules:
            db.add(IOGPPredictionModel(
                prediction_id=pred.id,
                rule_name=r.rule_name,
                probability=r.probability,
                is_primary=r.is_primary
            ))

        for h in triage_result.entities.hazards:
            db.add(ReportEntityModel(report_id=report.id, category="hazard", value=h))
        for e in triage_result.entities.energy_sources:
            db.add(ReportEntityModel(report_id=report.id, category="energy", value=e))
        for ex in triage_result.entities.exposures:
            db.add(ReportEntityModel(report_id=report.id, category="exposure", value=ex))
        for c in triage_result.entities.controls:
            db.add(ReportEntityModel(report_id=report.id, category="control", value=c))
        for cf in triage_result.entities.control_failures:
            db.add(ReportEntityModel(report_id=report.id, category="control_failure", value=cf))
        for cq in triage_result.entities.consequences:
            db.add(ReportEntityModel(report_id=report.id, category="consequence", value=cq))

        for s in triage_result.evidence_spans:
            db.add(EvidenceSpanModel(
                prediction_id=pred.id,
                text=s.text,
                start_char=s.start_char,
                end_char=s.end_char,
                category=s.category
            ))

        review = ReviewModel(
            report_id=report.id,
            status="PENDING",
            final_psif_label=triage_result.psif.priority
        )
        db.add(review)

        # Audit Event
        audit_details = f"Ingested & triaged: score={quality_res.score} ({quality_res.grade}), priority={triage_result.psif.priority}"
        if pii_matches:
            audit_details += f", redacted {len(pii_matches)} PII entities"
        if duplicates:
            audit_details += f", flagged {len(duplicates)} potential duplicates"

        db.add(AuditEventModel(
            report_id=report.id,
            action="REPORT_INGESTION_AND_TRIAGE",
            actor_id=payload.reporter_role or "REPORTER",
            details=audit_details
        ))

        if commit:
            db.commit()
            db.refresh(report)

        primary_rule = None
        for rule in triage_result.life_saving_rules:
            if rule.is_primary:
                primary_rule = rule.rule_name
                break
        if not primary_rule and triage_result.life_saving_rules:
            primary_rule = triage_result.life_saving_rules[0].rule_name

        item_status = "SUCCESS"
        if duplicates and duplicates[0]["similarity"] >= 0.95:
            item_status = "DUPLICATE_WARNING"

        item_result = BatchIngestItemResult(
            index=0,
            report_id=report.report_id,
            status=item_status,
            quality_score=quality_res.score,
            quality_grade=quality_res.grade,
            quality_issues=quality_res.issues,
            duplicate_matches=duplicates[:3],
            psif_probability=triage_result.psif.probability,
            priority=triage_result.psif.priority,
            primary_rule=primary_rule
        )

        return report, item_result

    def process_batch(self, reports: List[ReportCreate], db: Session) -> BatchIngestResponse:
        """Processes a list of report objects in a unified batch transaction."""
        items: List[BatchIngestItemResult] = []
        successful = 0
        failed = 0
        duplicate_count = 0
        grade_breakdown: Dict[str, int] = {"A": 0, "B": 0, "C": 0, "D": 0, "F": 0}
        total_score = 0.0

        # Preload recent reports for duplicate checking
        recent = db.query(ReportModel.id, ReportModel.report_id, ReportModel.normalized_text, ReportModel.location).order_by(ReportModel.report_timestamp.desc()).limit(300).all()
        cache = [
            {"id": r.report_id, "raw_text": r.normalized_text, "location": r.location}
            for r in recent
        ]

        for idx, rep_payload in enumerate(reports):
            try:
                report_model, item_res = self.process_single(
                    payload=rep_payload,
                    db=db,
                    existing_reports_cache=cache,
                    commit=False
                )
                item_res.index = idx
                items.append(item_res)

                # Add to cache for subsequent items in same batch
                cache.append({
                    "id": report_model.report_id,
                    "raw_text": report_model.normalized_text,
                    "location": report_model.location
                })

                successful += 1
                total_score += item_res.quality_score
                grade = item_res.quality_grade
                grade_breakdown[grade] = grade_breakdown.get(grade, 0) + 1

                if item_res.status == "DUPLICATE_WARNING":
                    duplicate_count += 1

            except Exception as ex:
                failed += 1
                items.append(BatchIngestItemResult(
                    index=idx,
                    report_id=None,
                    status="REJECTED",
                    quality_score=0.0,
                    quality_grade="F",
                    quality_issues=["Processing failure"],
                    duplicate_matches=[],
                    error_message=str(ex)
                ))

        db.commit()

        avg_score = round(total_score / successful, 1) if successful > 0 else 0.0

        return BatchIngestResponse(
            total_processed=len(reports),
            successful_count=successful,
            failed_count=failed,
            duplicate_count=duplicate_count,
            average_quality_score=avg_score,
            grade_breakdown=grade_breakdown,
            items=items
        )

    def parse_and_process_csv(self, csv_content: str, db: Session) -> BatchIngestResponse:
        """
        Parses CSV data, flexibly mapping column headers to the canonical schema,
        validates records, and executes batch ingestion.
        """
        stream = io.StringIO(csv_content.strip())
        reader = csv.DictReader(stream)

        if not reader.fieldnames:
            return BatchIngestResponse(
                total_processed=0,
                successful_count=0,
                failed_count=0,
                duplicate_count=0,
                average_quality_score=0.0,
                grade_breakdown={"A": 0, "B": 0, "C": 0, "D": 0, "F": 0},
                items=[]
            )

        # Header normalization mapping
        header_map = {}
        for col in reader.fieldnames:
            col_lower = col.lower().strip().replace(" ", "_").replace("-", "_")
            header_map[col_lower] = col

        def find_col(aliases: List[str]) -> Optional[str]:
            for a in aliases:
                if a in header_map:
                    return header_map[a]
            return None

        narrative_col = find_col(["narrative", "description", "incident_description", "raw_text", "details", "event_description", "observation"])
        site_col = find_col(["site", "facility", "asset", "location_site", "installation", "plant"])
        location_col = find_col(["location", "area", "sub_location", "unit", "workplace", "well"])
        dept_col = find_col(["department", "dept", "function", "discipline"])
        activity_col = find_col(["activity", "task", "operation", "work_type", "job"])
        equipment_col = find_col(["equipment", "equipment_involved", "equipment_tag", "asset_tag", "machinery"])
        role_col = find_col(["reporter_role", "reported_by", "designation", "role", "reporter"])
        type_col = find_col(["report_type", "incident_type", "event_type", "type"])

        reports: List[ReportCreate] = []
        for row in reader:
            narrative = (row.get(narrative_col) or "").strip() if narrative_col else ""
            if not narrative or len(narrative) < 5:
                continue

            site = (row.get(site_col) or "").strip() if site_col else "Oil India Operational Field"
            if not site:
                site = "Oil India Operational Field"

            location = (row.get(location_col) or "").strip() if location_col else None
            dept = (row.get(dept_col) or "").strip() if dept_col else None
            activity = (row.get(activity_col) or "").strip() if activity_col else None
            role = (row.get(role_col) or "").strip() if role_col else None
            rep_type = (row.get(type_col) or "near_miss").strip() if type_col else "near_miss"

            equipment = None
            if equipment_col and row.get(equipment_col):
                eq_val = row.get(equipment_col).strip()
                if eq_val.startswith("[") and eq_val.endswith("]"):
                    try:
                        equipment = json.loads(eq_val)
                    except Exception:
                        equipment = [eq_val]
                else:
                    equipment = [e.strip() for e in eq_val.split(",") if e.strip()]

            reports.append(ReportCreate(
                report_type=rep_type,
                site=site,
                location=location,
                department=dept,
                activity=activity,
                equipment=equipment,
                reporter_role=role,
                narrative=narrative
            ))

        return self.process_batch(reports, db)

    def get_quality_summary(self, db: Session) -> DataQualitySummaryResponse:
        """Calculates global data quality analytics over all ingested reports."""
        reports = db.query(ReportModel.quality_score, ReportModel.quality_grade, ReportModel.normalized_text).all()
        total = len(reports)
        if total == 0:
            return DataQualitySummaryResponse(
                total_reports=0,
                average_quality_score=0.0,
                grade_distribution={"A": 0, "B": 0, "C": 0, "D": 0, "F": 0},
                dimension_averages={
                    "narrative_depth": 0.0,
                    "metadata_completeness": 0.0,
                    "hazard_specificity": 0.0,
                    "barrier_information": 0.0
                },
                common_issues=[]
            )

        grade_counts = {"A": 0, "B": 0, "C": 0, "D": 0, "F": 0}
        total_score = 0.0
        issue_counts: Dict[str, int] = {}
        dim_totals = {
            "narrative_depth": 0.0,
            "metadata_completeness": 0.0,
            "hazard_specificity": 0.0,
            "barrier_information": 0.0
        }

        # Analyze a representative sample of up to 100 reports for dimension averages
        sample_size = min(total, 100)
        sample = reports[:sample_size]
        for r in sample:
            score = r.quality_score or 50.0
            grade = r.quality_grade or "C"
            total_score += score
            grade_counts[grade] = grade_counts.get(grade, 0) + 1

            # Recalculate dimensions for detailed breakdown
            res = self.quality_scorer.score_report(r.normalized_text)
            for dim, val in res.dimension_scores.items():
                dim_totals[dim] += val
            for iss in res.issues:
                issue_counts[iss] = issue_counts.get(iss, 0) + 1

        avg_score = round(total_score / sample_size, 1)
        dim_avgs = {dim: round(val / sample_size, 1) for dim, val in dim_totals.items()}

        sorted_issues = [
            {"issue": k, "count": v, "percentage": round(v / sample_size * 100, 1)}
            for k, v in sorted(issue_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        ]

        return DataQualitySummaryResponse(
            total_reports=total,
            average_quality_score=avg_score,
            grade_distribution=grade_counts,
            dimension_averages=dim_avgs,
            common_issues=sorted_issues
        )


ingestion_service = IngestionService()
