"""
OIL-SIF Guardian — Codified Safety Rule Engine Pydantic Schemas
Data contracts for deterministic safety rule evaluation, zero-tolerance vetoes,
catalog exploration, and statutory compliance auditing.
"""

from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class RuleEvaluationRequest(BaseModel):
    narrative: str = Field(..., min_length=5, description="Unstructured incident or near-miss narrative text.")
    title: Optional[str] = Field(default="", description="Optional incident headline or activity description.")


class TriggeredRuleDetail(BaseModel):
    rule_id: str
    rule_name: str
    iogp_category: str
    severity: str
    description: str
    failure_mechanism: str
    regulatory_standard: str
    stop_work_action: str
    prescribed_safeguards: List[str] = Field(default_factory=list)


class AuditTrailItem(BaseModel):
    rule_id: str
    rule_name: str
    severity: str
    regulatory_standard: Optional[str] = None
    stop_work_action: Optional[str] = None
    action_status: Optional[str] = None
    action_taken: Optional[str] = None


class RuleEvaluationResponse(BaseModel):
    mandatory_high_psif: bool
    triggered_rules: List[str]
    triggered_rule_details: List[TriggeredRuleDetail]
    rule_reasons: List[str]
    suggested_rules: List[str]
    is_benign: bool
    severity_level: str
    stop_work_required: bool
    audit_trail: List[AuditTrailItem]
    latency_ms: float
    raw_text: str


class RuleCatalogItem(BaseModel):
    rule_id: str
    rule_name: str
    iogp_category: str
    severity: str
    description: str
    failure_mechanism: str
    regulatory_standard: str
    stop_work_action: str
    prescribed_safeguards: List[str] = Field(default_factory=list)


class RuleCatalogResponse(BaseModel):
    total_rules: int
    rules: List[RuleCatalogItem]
    categories: List[str]
    severities: List[str]


class RuleTriggerStat(BaseModel):
    rule_id: str
    rule_name: str
    iogp_category: str
    trigger_count: int
    benchmark_prevalence_pct: float
    regulatory_standard: str


class RuleStatsResponse(BaseModel):
    total_evaluated: int
    high_psif_count: int
    high_psif_recall: float
    zero_tolerance_vetoes: int
    benign_suppressions: int
    top_triggered_rules: List[RuleTriggerStat]
    category_distribution: Dict[str, int]
