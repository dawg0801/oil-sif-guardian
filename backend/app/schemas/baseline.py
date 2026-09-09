"""
Pydantic schemas for TF-IDF baseline model status and comparative benchmark evaluations.
"""

from typing import Dict, List

from pydantic import BaseModel


class BaselineModelStatusResponse(BaseModel):
    is_trained: bool
    vocabulary_size: int
    training_samples: int
    model_path: str


class BaselineEvaluationReportSchema(BaseModel):
    model_name: str
    total_samples: int
    high_psif_recall: float
    high_psif_precision: float
    high_psif_f1: float
    overall_accuracy: float
    iogp_rule_match_rate: float
    average_latency_ms: float
    confusion_matrix: Dict[str, Dict[str, int]]


class BaselineComparisonResponse(BaseModel):
    timestamp: str
    total_benchmark_samples: int
    deterministic_rule_engine: BaselineEvaluationReportSchema
    tfidf_baseline: BaselineEvaluationReportSchema
    calibrated_hybrid: BaselineEvaluationReportSchema
    key_findings: List[str]


class TrainBaselineRequest(BaseModel):
    use_golden_benchmark: bool = True
    use_db_reports: bool = True
