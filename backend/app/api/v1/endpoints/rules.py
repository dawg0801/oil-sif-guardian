"""
OIL-SIF Guardian — Codified Safety Rule Engine API Endpoints
REST endpoints for deterministic safety rule evaluation, zero-tolerance vetoes,
regulatory rulebook catalog browsing, and golden benchmark compliance statistics.
"""

import json
import os
import time
from collections import Counter
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query, status

from backend.app.schemas.rules_schemas import (
    AuditTrailItem,
    RuleCatalogItem,
    RuleCatalogResponse,
    RuleEvaluationRequest,
    RuleEvaluationResponse,
    RuleStatsResponse,
    RuleTriggerStat,
    TriggeredRuleDetail,
)
from rules.safety.catalog import CODIFIED_SAFETY_CATALOG
from rules.safety.deterministic_rules import DeterministicSafetyRuleEngine

router = APIRouter()

# Singleton Rule Engine Instance
rule_engine = DeterministicSafetyRuleEngine()

# Cache for Golden Benchmark Stats
_CACHED_STATS: Optional[Dict[str, Any]] = None


@router.post(
    "/evaluate",
    response_model=RuleEvaluationResponse,
    summary="Evaluate Narrative Against Codified Safety Rules",
    description="Evaluates unstructured safety narrative against codified zero-tolerance industrial safety rules and statutory guardrails."
)
def evaluate_rules(request: RuleEvaluationRequest) -> RuleEvaluationResponse:
    t0 = time.perf_counter()
    eval_res = rule_engine.evaluate(text=request.narrative, title=request.title or "")
    latency_ms = (time.perf_counter() - t0) * 1000.0

    triggered_details = [
        TriggeredRuleDetail(
            rule_id=d.get("rule_id", ""),
            rule_name=d.get("rule_name", ""),
            iogp_category=d.get("iogp_category", ""),
            severity=d.get("severity", ""),
            description=d.get("description", ""),
            failure_mechanism=d.get("failure_mechanism", ""),
            regulatory_standard=d.get("regulatory_standard", ""),
            stop_work_action=d.get("stop_work_action", ""),
            prescribed_safeguards=d.get("prescribed_safeguards", [])
        )
        for d in eval_res.get("triggered_rule_details", [])
    ]

    audit_trail = [
        AuditTrailItem(
            rule_id=a.get("rule_id", ""),
            rule_name=a.get("rule_name", ""),
            severity=a.get("severity", ""),
            regulatory_standard=a.get("regulatory_standard"),
            stop_work_action=a.get("stop_work_action"),
            action_status=a.get("action_status") or a.get("status"),
            action_taken=a.get("action_taken")
        )
        for a in eval_res.get("audit_trail", [])
    ]

    return RuleEvaluationResponse(
        mandatory_high_psif=eval_res.get("mandatory_high_psif", False),
        triggered_rules=eval_res.get("triggered_rules", []),
        triggered_rule_details=triggered_details,
        rule_reasons=eval_res.get("rule_reasons", []),
        suggested_rules=eval_res.get("suggested_rules", []),
        is_benign=eval_res.get("is_benign", False),
        severity_level=eval_res.get("severity_level", "NONE_TRIGGERED"),
        stop_work_required=eval_res.get("stop_work_required", False),
        audit_trail=audit_trail,
        latency_ms=round(latency_ms, 3),
        raw_text=request.narrative
    )


@router.get(
    "/catalog",
    response_model=RuleCatalogResponse,
    summary="Browse Codified Safety Rule Catalog",
    description="Retrieves full codified safety rulebook with optional filtering by IOGP category and severity."
)
def get_rule_catalog(
    category: Optional[str] = Query(None, description="Filter by IOGP category"),
    severity: Optional[str] = Query(None, description="Filter by rule severity")
) -> RuleCatalogResponse:
    all_rules: List[RuleCatalogItem] = []
    categories_set = set()
    severities_set = set()

    for r_def in CODIFIED_SAFETY_CATALOG.values():
        categories_set.add(r_def.iogp_category)
        severities_set.add(r_def.severity.value)

        # Apply category filter if provided
        if category and category.lower() != "all" and r_def.iogp_category.lower() != category.lower():
            continue

        # Apply severity filter if provided
        if severity and severity.lower() != "all" and r_def.severity.value.lower() != severity.lower():
            continue

        all_rules.append(
            RuleCatalogItem(
                rule_id=r_def.rule_id,
                rule_name=r_def.rule_name,
                iogp_category=r_def.iogp_category,
                severity=r_def.severity.value,
                description=r_def.description,
                failure_mechanism=r_def.failure_mechanism,
                regulatory_standard=r_def.regulatory_standard,
                stop_work_action=r_def.stop_work_action,
                prescribed_safeguards=r_def.prescribed_safeguards
            )
        )

    # Sort rules alphabetically by rule_id
    all_rules.sort(key=lambda r: r.rule_id)

    return RuleCatalogResponse(
        total_rules=len(all_rules),
        rules=all_rules,
        categories=sorted(list(categories_set)),
        severities=sorted(list(severities_set))
    )


@router.get(
    "/catalog/{rule_id}",
    response_model=RuleCatalogItem,
    summary="Get Rule Definition by ID",
    description="Retrieves single codified safety rule definition by its unique identifier (e.g. RULE-CS-001)."
)
def get_rule_by_id(rule_id: str) -> RuleCatalogItem:
    r_def = CODIFIED_SAFETY_CATALOG.get(rule_id.upper())
    if not r_def:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Rule ID '{rule_id}' not found in Codified Safety Catalog."
        )

    return RuleCatalogItem(
        rule_id=r_def.rule_id,
        rule_name=r_def.rule_name,
        iogp_category=r_def.iogp_category,
        severity=r_def.severity.value,
        description=r_def.description,
        failure_mechanism=r_def.failure_mechanism,
        regulatory_standard=r_def.regulatory_standard,
        stop_work_action=r_def.stop_work_action,
        prescribed_safeguards=r_def.prescribed_safeguards
    )


@router.get(
    "/stats",
    response_model=RuleStatsResponse,
    summary="Codified Rule Engine Performance on Golden Benchmark",
    description="Calculates deterministic veto performance, High-PSIF recall guarantee, and rule trigger distribution across the 124-event golden benchmark."
)
def get_rule_stats() -> RuleStatsResponse:
    global _CACHED_STATS
    if _CACHED_STATS is not None:
        return RuleStatsResponse(**_CACHED_STATS)

    benchmark_path = os.path.join("data", "evaluation", "golden_benchmark.json")
    if not os.path.exists(benchmark_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Golden benchmark dataset not found at data/evaluation/golden_benchmark.json"
        )

    with open(benchmark_path, "r", encoding="utf-8") as f:
        scenarios = json.load(f)

    total_evaluated = len(scenarios)
    high_psif_gt_count = 0
    high_psif_detected_count = 0
    zero_tolerance_vetoes = 0
    benign_suppressions = 0

    rule_counts: Counter = Counter()
    category_counts: Counter = Counter()

    for item in scenarios:
        narrative = item.get("narrative", "")
        title = item.get("title", "")
        gt = item.get("ground_truth", {})
        is_true_high = (gt.get("psif_priority") == "HIGH")

        if is_true_high:
            high_psif_gt_count += 1

        eval_res = rule_engine.evaluate(text=narrative, title=title)

        if eval_res["is_benign"]:
            benign_suppressions += 1

        if eval_res["mandatory_high_psif"]:
            zero_tolerance_vetoes += 1
            if is_true_high:
                high_psif_detected_count += 1

        for detail in eval_res.get("triggered_rule_details", []):
            r_id = detail.get("rule_id", "")
            cat = detail.get("iogp_category", "None")
            rule_counts[r_id] += 1
            category_counts[cat] += 1

    recall = round(high_psif_detected_count / high_psif_gt_count, 4) if high_psif_gt_count > 0 else 1.0

    top_triggered: List[RuleTriggerStat] = []
    for r_id, count in rule_counts.most_common(12):
        r_def = CODIFIED_SAFETY_CATALOG.get(r_id)
        if r_def:
            prev_pct = round((count / total_evaluated) * 100.0, 2)
            top_triggered.append(
                RuleTriggerStat(
                    rule_id=r_def.rule_id,
                    rule_name=r_def.rule_name,
                    iogp_category=r_def.iogp_category,
                    trigger_count=count,
                    benchmark_prevalence_pct=prev_pct,
                    regulatory_standard=r_def.regulatory_standard
                )
            )

    stats_dict = {
        "total_evaluated": total_evaluated,
        "high_psif_count": high_psif_gt_count,
        "high_psif_recall": recall,
        "zero_tolerance_vetoes": zero_tolerance_vetoes,
        "benign_suppressions": benign_suppressions,
        "top_triggered_rules": [t.model_dump() for t in top_triggered],
        "category_distribution": dict(category_counts)
    }

    _CACHED_STATS = stats_dict
    return RuleStatsResponse(**stats_dict)
