"""
API Endpoints for Data Annotation Protocol, Inter-Annotator Agreement, and Benchmark Evaluation.
"""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query, status

from backend.app.schemas.annotation import (
    AdjudicationBatchResponse,
    AdjudicationRequest,
    AgreementCalculationRequest,
    AgreementMetricsResponse,
    BenchmarkEvaluationResult,
    BenchmarkSummaryResponse,
    DisputeResolutionRequest,
)
from backend.app.services.triage_service import triage_service
from ml.annotation.adjudicator import adjudication_engine
from ml.annotation.inter_annotator_agreement import agreement_engine

router = APIRouter()

# Try parents[5] (workspace root from backend/app/api/v1/endpoints) and fallback to parents[4]
_root = Path(__file__).resolve().parents[5]
if not (_root / "data" / "evaluation" / "golden_benchmark.json").exists():
    _root = Path(__file__).resolve().parents[4]

BENCHMARK_FILE = _root / "data" / "evaluation" / "golden_benchmark.json"


def _load_benchmark_records() -> List[Dict[str, Any]]:
    if not BENCHMARK_FILE.exists():
        return []
    try:
        with open(BENCHMARK_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


@router.post("/calculate-agreement", response_model=AgreementMetricsResponse)
def calculate_inter_annotator_agreement(payload: AgreementCalculationRequest):
    """
    Computes Cohen's Kappa, Krippendorff's Alpha, and Evidence Span Jaccard / F1
    between independent annotations submitted by Annotator A and Annotator B.
    """
    items_a = [item.model_dump() for item in payload.annotator_a_items]
    items_b = [item.model_dump() for item in payload.annotator_b_items]

    report = agreement_engine.generate_full_report(items_a, items_b)
    if "error" in report:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=report["error"])

    return AgreementMetricsResponse(
        total_items=report["total_items"],
        disagreement_count=report["disagreement_count"],
        disagreement_rate=report["disagreement_rate"],
        metrics=report["metrics"],
        disagreements=report["disagreements"]
    )


@router.post("/adjudicate", response_model=AdjudicationBatchResponse)
def adjudicate_annotations(payload: AdjudicationRequest):
    """
    Processes dual annotations, automatically approving consensus items
    and routing conflicting annotations to the Senior HSE Lead adjudication queue.
    """
    items_a = [item.model_dump() for item in payload.annotator_a_items]
    items_b = [item.model_dump() for item in payload.annotator_b_items]

    res = adjudication_engine.process_batch(items_a, items_b)
    return AdjudicationBatchResponse(
        total_processed=res["total_processed"],
        consensus_count=res["consensus_count"],
        dispute_count=res["dispute_count"],
        consensus_rate=res["consensus_rate"],
        approved_items=res["approved_items"],
        pending_disputes=res["pending_disputes"]
    )


@router.post("/resolve-dispute")
def resolve_dispute(payload: DisputeResolutionRequest):
    """
    Resolves an escalated annotation dispute with HSE Lead final signoff and rationale.
    """
    return adjudication_engine.resolve_dispute(
        dispute_item=payload.dispute_item,
        lead_id=payload.lead_id,
        final_is_psif=payload.final_is_psif,
        final_priority=payload.final_priority,
        final_primary_rule=payload.final_primary_rule,
        final_spans=payload.final_spans,
        rationale=payload.rationale
    )


@router.get("/benchmark", response_model=BenchmarkSummaryResponse)
def get_golden_benchmark(
    limit: int = Query(20, ge=1, le=124),
    rule: Optional[str] = Query(None)
):
    """
    Returns canonical Golden Benchmark statistics, rule distributions, and test cases.
    """
    records = _load_benchmark_records()
    if not records:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Golden benchmark file not found.")

    rule_counts: Dict[str, int] = {}
    prio_counts: Dict[str, int] = {}

    for r in records:
        gt = r.get("ground_truth", {})
        r_name = gt.get("primary_iogp_rule") or "None / Benign"
        rule_counts[r_name] = rule_counts.get(r_name, 0) + 1

        prio = gt.get("psif_priority", "REVIEW")
        prio_counts[prio] = prio_counts.get(prio, 0) + 1

    filtered = records
    if rule:
        filtered = [
            r for r in records
            if (r.get("ground_truth", {}).get("primary_iogp_rule") or "").lower() == rule.lower()
        ]

    return BenchmarkSummaryResponse(
        total_benchmark_records=len(records),
        rule_breakdown=rule_counts,
        priority_breakdown=prio_counts,
        sample_cases=filtered[:limit]
    )


@router.post("/benchmark/evaluate", response_model=BenchmarkEvaluationResult)
def evaluate_against_benchmark():
    """
    Executes the live hybrid triage engine against the entire locked Golden Benchmark (124 events).
    Computes overall Accuracy, High-PSIF Precision, Recall, F1 score, and IOGP Rule Match Rate.
    """
    records = _load_benchmark_records()
    if not records:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Golden benchmark dataset not found.")

    total = len(records)
    correct_priorities = 0
    correct_rules = 0

    # Binary High PSIF metrics
    tp, fp, fn, tn = 0, 0, 0, 0
    case_results = []

    for item in records:
        gt = item.get("ground_truth", {})
        gt_priority = gt.get("psif_priority", "LOW").upper()
        gt_rule = gt.get("primary_iogp_rule")

        # Run triage
        triage_res = triage_service.triage(
            narrative=item["narrative"],
            activity=item.get("activity", "Maintenance")
        )

        pred_priority = triage_res.psif.priority.upper()
        pred_rule = None
        for r in triage_res.life_saving_rules:
            if r.is_primary:
                pred_rule = r.rule_name
                break
        if not pred_rule and triage_res.life_saving_rules:
            pred_rule = triage_res.life_saving_rules[0].rule_name

        prio_match = (pred_priority == gt_priority)
        if prio_match:
            correct_priorities += 1

        rule_match = False
        if gt_rule is None:
            rule_match = (len(triage_res.life_saving_rules) == 0 or pred_rule is None)
        else:
            rule_match = (pred_rule == gt_rule) or any(r.rule_name == gt_rule for r in triage_res.life_saving_rules)

        if rule_match:
            correct_rules += 1

        # Binary PSIF counters
        is_gt_high = (gt_priority == "HIGH")
        is_pred_high = (pred_priority == "HIGH")

        if is_gt_high and is_pred_high:
            tp += 1
        elif not is_gt_high and is_pred_high:
            fp += 1
        elif is_gt_high and not is_pred_high:
            fn += 1
        else:
            tn += 1

        case_results.append({
            "benchmark_id": item.get("benchmark_id"),
            "title": item.get("title"),
            "ground_truth_priority": gt_priority,
            "predicted_priority": pred_priority,
            "priority_match": prio_match,
            "ground_truth_rule": gt_rule,
            "predicted_rule": pred_rule,
            "rule_match": rule_match,
            "confidence": triage_res.psif.confidence
        })

    accuracy = round(correct_priorities / total, 4) if total > 0 else 0.0
    precision = round(tp / (tp + fp), 4) if (tp + fp) > 0 else 0.0
    recall = round(tp / (tp + fn), 4) if (tp + fn) > 0 else 0.0
    f1 = round((2 * precision * recall) / (precision + recall), 4) if (precision + recall) > 0 else 0.0
    rule_rate = round(correct_rules / total, 4) if total > 0 else 0.0

    return BenchmarkEvaluationResult(
        total_evaluated=total,
        psif_accuracy=accuracy,
        psif_precision=precision,
        psif_recall=recall,
        psif_f1=f1,
        rule_match_rate=rule_rate,
        evaluated_cases=case_results
    )
