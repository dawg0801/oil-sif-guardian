"""
OIL-SIF Guardian — Calibrated Hybrid Decision Engine API Endpoints
Provides endpoints for multi-model decision fusion, dynamic triage priority,
probability calibration reports (ECE / Brier), and ensemble weight tuning.
"""

import os
import time
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, status

from backend.app.schemas.decision_schemas import (
    CalibrationBinPoint,
    CalibrationReportResponse,
    DecisionStatusResponse,
    HybridDecisionRequest,
    HybridDecisionResponse,
    ModelContribution,
    WeightTuneRequest,
    WeightTuneResponse,
)
from ml.decision.hybrid_arbiter import HybridDecisionEngine

router = APIRouter()

# Singleton Hybrid Decision Engine
engine = HybridDecisionEngine()

# Cache for Golden Benchmark Calibration Report
_CACHED_CALIBRATION: Optional[Dict[str, Any]] = None


@router.post(
    "/triage",
    response_model=HybridDecisionResponse,
    summary="Execute Calibrated Hybrid Decision Triage",
    description="Fuses Deterministic Safety Guardrails, Contextual Sequence Model, IOGP Multi-Label Classifier, and TF-IDF Prior into a calibrated PSIF triage decision."
)
def triage_decision(request: HybridDecisionRequest) -> HybridDecisionResponse:
    try:
        decision = engine.evaluate(
            narrative=request.narrative,
            title=request.title or "",
            weight_overrides=request.weight_overrides
        )

        contribs = {
            k: ModelContribution(
                model_name=v.model_name,
                raw_probability=v.raw_probability,
                assigned_weight=v.assigned_weight if v.assigned_weight != float("inf") else 999.0,
                weighted_probability=v.weighted_probability
            )
            for k, v in decision.model_contributions.items()
        }

        return HybridDecisionResponse(
            fused_psif_probability=decision.fused_psif_probability,
            priority=decision.priority,
            confidence_score=decision.confidence_score,
            is_veto_enforced=decision.is_veto_enforced,
            is_benign=decision.is_benign,
            decision_rationale=decision.decision_rationale,
            primary_iogp_rule=decision.primary_iogp_rule,
            secondary_iogp_rules=decision.secondary_iogp_rules,
            triggered_rules=decision.triggered_rules,
            model_contributions=contribs,
            calibration_factor=decision.calibration_factor,
            latency_ms=decision.latency_ms,
            raw_text=decision.raw_text
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Hybrid decision triage failed: {str(e)}"
        )


@router.get(
    "/calibration",
    response_model=CalibrationReportResponse,
    summary="Get Expected Calibration Error & Reliability Diagram",
    description="Evaluates all 124 golden benchmark scenarios to compute ECE, Brier score, and 10-bin reliability diagram coordinates."
)
def get_calibration_report() -> CalibrationReportResponse:
    global _CACHED_CALIBRATION
    if _CACHED_CALIBRATION is not None:
        return CalibrationReportResponse(**_CACHED_CALIBRATION)

    benchmark_path = os.path.join("data", "evaluation", "golden_benchmark.json")
    if not os.path.exists(benchmark_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Golden benchmark file not found."
        )

    summary, cal_metrics = engine.evaluate_golden_benchmark(benchmark_path)

    bins_pydantic = [
        CalibrationBinPoint(
            bin_index=b.bin_index,
            bin_lower=b.bin_lower,
            bin_upper=b.bin_upper,
            sample_count=b.sample_count,
            mean_confidence=b.mean_confidence,
            empirical_accuracy=b.empirical_accuracy
        )
        for b in cal_metrics.bins
    ]

    report_dict = {
        "total_samples": summary["total_samples"],
        "true_high_psif_count": summary["true_high_psif_count"],
        "detected_high_psif_count": summary["detected_high_psif_count"],
        "high_psif_recall": summary["high_psif_recall"],
        "priority_accuracy": summary["priority_accuracy"],
        "ece": cal_metrics.ece,
        "mce": cal_metrics.mce,
        "brier_score": cal_metrics.brier_score,
        "temperature": cal_metrics.temperature,
        "bins": [b.model_dump() for b in bins_pydantic],
        "active_weights": summary["active_weights"],
        "active_thresholds": summary["active_thresholds"],
        "evaluated_at": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
    }

    _CACHED_CALIBRATION = report_dict
    return CalibrationReportResponse(**report_dict)


@router.post(
    "/tune-weights",
    response_model=WeightTuneResponse,
    summary="Tune Ensemble Weights & Thresholds",
    description="Dynamically updates the arbitration ensemble weights and decision thresholds."
)
def tune_weights(request: WeightTuneRequest) -> WeightTuneResponse:
    global _CACHED_CALIBRATION
    _CACHED_CALIBRATION = None  # Invalidate cache upon weight modification

    current = engine.tune_weights(
        sequence_weight=request.sequence_weight,
        iogp_weight=request.iogp_weight,
        tfidf_weight=request.tfidf_weight,
        tau_high=request.tau_high,
        tau_low=request.tau_low,
        temperature=request.temperature
    )

    return WeightTuneResponse(
        updated=True,
        current_weights=current,
        message="Ensemble arbitration weights and calibration parameters successfully updated."
    )


@router.get(
    "/status",
    response_model=DecisionStatusResponse,
    summary="Hybrid Decision Engine Operational Status",
    description="Returns loading status of underlying models, active weights, and calibration parameters."
)
def get_decision_status() -> DecisionStatusResponse:
    return DecisionStatusResponse(
        engine_name="CalibratedHybridDecisionEngine",
        version="1.0.0",
        models_loaded={
            "deterministic_rule_engine": True,
            "contextual_sequence_classifier": getattr(engine.sequence_classifier, "is_trained", False),
            "iogp_multilabel_classifier": True,
            "tfidf_baseline": getattr(engine.tfidf_baseline, "is_trained", False)
        },
        active_weights={
            "sequence_weight": engine.sequence_weight,
            "iogp_weight": engine.iogp_weight,
            "tfidf_weight": engine.tfidf_weight
        },
        active_thresholds={
            "tau_high": engine.tau_high,
            "tau_low": engine.tau_low
        },
        temperature=engine.calibrator.temperature,
        zero_tolerance_enforced=True
    )
