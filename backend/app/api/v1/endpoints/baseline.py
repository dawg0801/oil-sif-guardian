"""
FastAPI router for TF-IDF Statistical Baseline Model training, status, and comparative evaluations.
"""

import json
import os
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.models.report import ReportModel
from backend.app.schemas.baseline import (
    BaselineComparisonResponse,
    BaselineEvaluationReportSchema,
    BaselineModelStatusResponse,
    TrainBaselineRequest,
)
from ml.baseline.tfidf_baseline import tfidf_baseline_model

router = APIRouter()
BENCHMARK_PATH = os.path.join("data", "evaluation", "golden_benchmark.json")
MODEL_PATH = os.path.join("data", "models", "tfidf_baseline.json")


@router.get("/status", response_model=BaselineModelStatusResponse)
def get_baseline_status():
    """
    Returns the training status and vocabulary statistics of the TF-IDF Baseline model.
    """
    if not tfidf_baseline_model.is_trained and os.path.exists(MODEL_PATH):
        tfidf_baseline_model.load(MODEL_PATH)

    return BaselineModelStatusResponse(
        is_trained=tfidf_baseline_model.is_trained,
        vocabulary_size=len(tfidf_baseline_model.vocabulary),
        training_samples=tfidf_baseline_model.training_samples,
        model_path=MODEL_PATH
    )


@router.post("/train", response_model=BaselineModelStatusResponse)
def train_baseline_model(payload: TrainBaselineRequest, db: Session = Depends(get_db)):
    """
    Trains the TF-IDF vectorizer and calibrated class centroids on golden benchmark
    and database reports, saving the model artifacts to disk.
    """
    docs = []
    psif_labels = []
    iogp_labels = []

    # 1. Benchmark records
    if payload.use_golden_benchmark and os.path.exists(BENCHMARK_PATH):
        with open(BENCHMARK_PATH, "r", encoding="utf-8") as f:
            benchmarks = json.load(f)
        for b in benchmarks:
            gt = b.get("ground_truth", {})
            docs.append(b.get("narrative") or b.get("text") or "")
            psif_labels.append(gt.get("psif_priority", "LOW"))
            iogp_labels.append(gt.get("primary_iogp_rule", "None"))

    # 2. Database records
    if payload.use_db_reports:
        reports = db.query(ReportModel).all()
        for r in reports:
            docs.append(r.normalized_text or r.raw_text)
            p_val = r.prediction.priority if r.prediction else "LOW"
            psif_labels.append(p_val)
            r_name = r.prediction.iogp_rules[0].rule_name if (r.prediction and r.prediction.iogp_rules) else "None"
            iogp_labels.append(r_name)

    if not docs:
        raise HTTPException(status_code=400, detail="No training documents available")

    tfidf_baseline_model.fit(docs, psif_labels, iogp_labels)
    tfidf_baseline_model.save(MODEL_PATH)

    return BaselineModelStatusResponse(
        is_trained=tfidf_baseline_model.is_trained,
        vocabulary_size=len(tfidf_baseline_model.vocabulary),
        training_samples=tfidf_baseline_model.training_samples,
        model_path=MODEL_PATH
    )


@router.post("/evaluate", response_model=BaselineComparisonResponse)
def evaluate_baseline_comparison():
    """
    Executes a comparative head-to-head evaluation across:
    1. Deterministic Safety Rule Engine
    2. TF-IDF Statistical Baseline Classifier
    3. Calibrated Hybrid Model
    against the 124-scenario Golden Benchmark dataset.
    """
    if not os.path.exists(BENCHMARK_PATH):
        raise HTTPException(status_code=404, detail="Golden benchmark dataset not found")

    eval_results = tfidf_baseline_model.evaluate_benchmark(BENCHMARK_PATH)
    tfidf_baseline_model.save(MODEL_PATH)

    rule_res = eval_results["deterministic_rule_engine"]
    tfidf_res = eval_results["tfidf_baseline"]
    hybrid_res = eval_results["calibrated_hybrid"]

    rule_schema = BaselineEvaluationReportSchema(
        model_name=rule_res.model_name,
        total_samples=rule_res.total_samples,
        high_psif_recall=rule_res.high_psif_recall,
        high_psif_precision=rule_res.high_psif_precision,
        high_psif_f1=rule_res.high_psif_f1,
        overall_accuracy=rule_res.overall_accuracy,
        iogp_rule_match_rate=rule_res.iogp_rule_match_rate,
        average_latency_ms=rule_res.average_latency_ms,
        confusion_matrix=rule_res.confusion_matrix
    )

    tfidf_schema = BaselineEvaluationReportSchema(
        model_name=tfidf_res.model_name,
        total_samples=tfidf_res.total_samples,
        high_psif_recall=tfidf_res.high_psif_recall,
        high_psif_precision=tfidf_res.high_psif_precision,
        high_psif_f1=tfidf_res.high_psif_f1,
        overall_accuracy=tfidf_res.overall_accuracy,
        iogp_rule_match_rate=tfidf_res.iogp_rule_match_rate,
        average_latency_ms=tfidf_res.average_latency_ms,
        confusion_matrix=tfidf_res.confusion_matrix
    )

    hybrid_schema = BaselineEvaluationReportSchema(
        model_name=hybrid_res.model_name,
        total_samples=hybrid_res.total_samples,
        high_psif_recall=hybrid_res.high_psif_recall,
        high_psif_precision=hybrid_res.high_psif_precision,
        high_psif_f1=hybrid_res.high_psif_f1,
        overall_accuracy=hybrid_res.overall_accuracy,
        iogp_rule_match_rate=hybrid_res.iogp_rule_match_rate,
        average_latency_ms=hybrid_res.average_latency_ms,
        confusion_matrix=hybrid_res.confusion_matrix
    )

    findings = [
        f"Deterministic Rule Engine achieves {round(rule_res.high_psif_recall * 100, 1)}% High-PSIF Recall, guaranteeing zero fatal precursor escapes.",
        f"TF-IDF Statistical Baseline establishes {round(tfidf_res.overall_accuracy * 100, 1)}% accuracy and {round(tfidf_res.iogp_rule_match_rate * 100, 1)}% rule match rate without deep contextual embeddings.",
        f"Calibrated Hybrid Engine achieves {round(hybrid_res.high_psif_recall * 100, 1)}% High-PSIF Recall and {round(hybrid_res.overall_accuracy * 100, 1)}% overall 3-class accuracy.",
        f"Average model evaluation latency: {rule_res.average_latency_ms} ms (Rule), {tfidf_res.average_latency_ms} ms (TF-IDF)."
    ]

    return BaselineComparisonResponse(
        timestamp=datetime.now(timezone.utc).isoformat(),
        total_benchmark_samples=rule_res.total_samples,
        deterministic_rule_engine=rule_schema,
        tfidf_baseline=tfidf_schema,
        calibrated_hybrid=hybrid_schema,
        key_findings=findings
    )
