"""
Integration Tests for Annotation and Benchmark Evaluation Endpoints.
"""

from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def test_calculate_agreement_api():
    payload = {
        "annotator_a_items": [
            {
                "item_id": "TEST-1",
                "raw_text": "Contractor entered tank without gas test.",
                "is_psif": True,
                "priority": "HIGH",
                "primary_rule": "Confined Space"
            },
            {
                "item_id": "TEST-2",
                "raw_text": "Minor paper cut in office.",
                "is_psif": False,
                "priority": "LOW",
                "primary_rule": "None"
            }
        ],
        "annotator_b_items": [
            {
                "item_id": "TEST-1",
                "raw_text": "Contractor entered tank without gas test.",
                "is_psif": True,
                "priority": "HIGH",
                "primary_rule": "Confined Space"
            },
            {
                "item_id": "TEST-2",
                "raw_text": "Minor paper cut in office.",
                "is_psif": False,
                "priority": "LOW",
                "primary_rule": "None"
            }
        ]
    }
    res = client.post("/api/v1/annotation/calculate-agreement", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["total_items"] == 2
    assert data["disagreement_count"] == 0
    assert data["metrics"]["cohens_kappa_psif"] == 1.0


def test_adjudicate_api():
    payload = {
        "annotator_a_items": [
            {
                "item_id": "TEST-1",
                "raw_text": "Worker was inside tank.",
                "is_psif": True,
                "priority": "HIGH",
                "primary_rule": "Confined Space"
            }
        ],
        "annotator_b_items": [
            {
                "item_id": "TEST-1",
                "raw_text": "Worker was inside tank.",
                "is_psif": False,
                "priority": "REVIEW",
                "primary_rule": "Work Authorization"
            }
        ]
    }
    res = client.post("/api/v1/annotation/adjudicate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["total_processed"] == 1
    assert data["dispute_count"] == 1
    assert len(data["pending_disputes"]) == 1


def test_get_golden_benchmark_api():
    res = client.get("/api/v1/annotation/benchmark?limit=10")
    assert res.status_code == 200
    data = res.json()
    assert data["total_benchmark_records"] >= 100
    assert "Confined Space" in data["rule_breakdown"]
    assert "HIGH" in data["priority_breakdown"]
    assert len(data["sample_cases"]) == 10


def test_benchmark_evaluate_api():
    res = client.post("/api/v1/annotation/benchmark/evaluate")
    assert res.status_code == 200
    data = res.json()
    assert data["total_evaluated"] >= 100
    assert data["psif_accuracy"] > 0.60
    assert data["psif_recall"] > 0.70
    assert data["rule_match_rate"] > 0.60
    assert len(data["evaluated_cases"]) >= 100
