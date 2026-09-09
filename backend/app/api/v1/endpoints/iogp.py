"""
OIL-SIF Guardian — IOGP Life-Saving Rules Multi-Label Endpoints
Provides REST API endpoints for multi-label inference, 9x9 joint barrier co-occurrence,
decision threshold recalibration, and golden benchmark evaluation.
"""

import os
from typing import Any, Dict

from fastapi import APIRouter, HTTPException, status

from backend.app.schemas.iogp_schemas import (
    IOGPCoOccurrenceItem,
    IOGPEvaluationReportResponse,
    IOGPMatrixResponse,
    IOGPMultiLabelResponse,
    IOGPPerRuleReport,
    IOGPPredictRequest,
    IOGPRuleResult,
    IOGPThresholdUpdateRequest,
    IOGPThresholdUpdateResponse,
)
from ml.evaluation.multilabel_metrics import MultiLabelEvaluator
from ml.models.iogp_multilabel import IOGPMultiLabelClassifier

router = APIRouter()

# Global singleton classifier instance
MODEL_FILEPATH = os.path.join("data", "models", "iogp_multilabel.json")
if os.path.exists(MODEL_FILEPATH):
    classifier = IOGPMultiLabelClassifier.load(MODEL_FILEPATH)
else:
    classifier = IOGPMultiLabelClassifier()
    classifier.save(MODEL_FILEPATH)

evaluator = MultiLabelEvaluator()


@router.post(
    "/predict",
    response_model=IOGPMultiLabelResponse,
    summary="Predict IOGP Life-Saving Rules (Multi-Label)",
    description="Evaluates narrative against all 9 IOGP Life-Saving Rules, returning primary and secondary designations."
)
def predict_iogp_rules(request: IOGPPredictRequest) -> IOGPMultiLabelResponse:
    try:
        prediction = classifier.predict(
            text=request.narrative,
            title=request.title or "",
            threshold_overrides=request.threshold_overrides
        )

        rule_scores_pydantic: Dict[str, IOGPRuleResult] = {}
        for r_name, score in prediction.rule_scores.items():
            rule_scores_pydantic[r_name] = IOGPRuleResult(
                rule_name=score.rule_name,
                probability=score.probability,
                threshold=score.threshold,
                is_triggered=score.is_triggered,
                rank=score.rank,
                evidence_spans=score.evidence_spans
            )

        co_tags_pydantic = [
            IOGPCoOccurrenceItem(
                rule_a=item["rule_a"],
                rule_b=item["rule_b"],
                historical_co_occurrences=item["historical_co_occurrences"],
                synergy_confidence=item["synergy_confidence"]
            )
            for item in prediction.co_occurrence_tags
        ]

        return IOGPMultiLabelResponse(
            primary_rule=prediction.primary_rule,
            secondary_rules=prediction.secondary_rules,
            triggered_rules=prediction.triggered_rules,
            rule_scores=rule_scores_pydantic,
            co_occurrence_tags=co_tags_pydantic,
            latency_ms=prediction.latency_ms,
            raw_text=prediction.raw_text
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error executing IOGP multi-label inference: {str(e)}"
        )


@router.get(
    "/matrix",
    response_model=IOGPMatrixResponse,
    summary="Get 9x9 IOGP Co-Occurrence Matrix",
    description="Returns empirical cross-barrier co-occurrence counts and top correlated rule pairs."
)
def get_co_occurrence_matrix() -> IOGPMatrixResponse:
    try:
        data = classifier.get_co_occurrence_matrix()
        return IOGPMatrixResponse(
            rules=data["rules"],
            matrix=data["matrix"],
            prevalence=data["prevalence"],
            top_pairs=data["top_pairs"]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving co-occurrence matrix: {str(e)}"
        )


@router.get(
    "/benchmark",
    response_model=IOGPEvaluationReportResponse,
    summary="Evaluate IOGP Multi-Label Benchmark",
    description="Evaluates classifier against all 124 expert-adjudicated golden benchmark events."
)
def run_benchmark_evaluation() -> IOGPEvaluationReportResponse:
    try:
        report = evaluator.evaluate_golden_benchmark(classifier)
        per_rule_pydantic = {
            r_name: IOGPPerRuleReport(
                rule_name=m.rule_name,
                true_positives=m.true_positives,
                false_positives=m.false_positives,
                false_negatives=m.false_negatives,
                true_negatives=m.true_negatives,
                support=m.support,
                precision=m.precision,
                recall=m.recall,
                f1=m.f1
            )
            for r_name, m in report.per_rule_metrics.items()
        }

        return IOGPEvaluationReportResponse(
            total_samples=report.total_samples,
            hamming_loss=report.hamming_loss,
            subset_accuracy=report.subset_accuracy,
            jaccard_similarity=report.jaccard_similarity,
            micro_precision=report.micro_precision,
            micro_recall=report.micro_recall,
            micro_f1=report.micro_f1,
            macro_precision=report.macro_precision,
            macro_recall=report.macro_recall,
            macro_f1=report.macro_f1,
            primary_rule_accuracy=report.primary_rule_accuracy,
            per_rule_metrics=per_rule_pydantic,
            average_latency_ms=report.average_latency_ms,
            evaluated_at=report.evaluated_at
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error evaluating golden benchmark: {str(e)}"
        )


@router.post(
    "/thresholds",
    response_model=IOGPThresholdUpdateResponse,
    summary="Update Decision Thresholds",
    description="Allows safety engineers to calibrate or tighten per-rule decision thresholds."
)
def update_thresholds(request: IOGPThresholdUpdateRequest) -> IOGPThresholdUpdateResponse:
    try:
        for r, tau in request.thresholds.items():
            if r in classifier.rules:
                if 0.05 <= tau <= 0.95:
                    classifier.thresholds[r] = round(tau, 3)

        classifier.save(MODEL_FILEPATH)
        return IOGPThresholdUpdateResponse(
            updated=True,
            current_thresholds=classifier.thresholds,
            message=f"Successfully updated {len(request.thresholds)} rule thresholds."
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid threshold update: {str(e)}"
        )


@router.get(
    "/status",
    summary="Get Classifier Status",
    description="Returns active rules, threshold configuration, and persistence file."
)
def get_status() -> Dict[str, Any]:
    return {
        "model_type": "IOGPMultiLabelClassifier",
        "version": "1.0.0-phase6",
        "rules_count": len(classifier.rules),
        "canonical_rules": classifier.rules,
        "current_thresholds": classifier.thresholds,
        "model_file": MODEL_FILEPATH,
        "is_persisted": os.path.exists(MODEL_FILEPATH)
    }
