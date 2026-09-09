"""
API Integration tests for IOGP Life-Saving Rules Multi-Label Endpoints.
"""

from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def test_iogp_predict_endpoint_high_hazard():
    payload = {
        "narrative": "Fitter entered the interior of test separator vessel through open manway without atmospheric gas test.",
        "title": "Separator Vessel Entry"
    }

    res = client.post("/api/v1/iogp/predict", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert data["primary_rule"] == "Confined Space"
    assert "Confined Space" in data["triggered_rules"]
    assert "Confined Space" in data["rule_scores"]
    assert data["rule_scores"]["Confined Space"]["is_triggered"] is True
    assert data["latency_ms"] > 0.0


def test_iogp_predict_endpoint_benign():
    payload = {
        "narrative": "Accounts clerk replaced cyan toner cartridge in laser printer on 2nd floor admin office."
    }

    res = client.post("/api/v1/iogp/predict", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert data["primary_rule"] == "None"
    assert len(data["triggered_rules"]) == 0
    assert len(data["secondary_rules"]) == 0


def test_iogp_matrix_endpoint():
    res = client.get("/api/v1/iogp/matrix")
    assert res.status_code == 200
    data = res.json()

    assert len(data["rules"]) == 9
    assert len(data["matrix"]) == 9
    assert len(data["top_pairs"]) > 0
    assert "prevalence" in data


def test_iogp_benchmark_endpoint():
    res = client.get("/api/v1/iogp/benchmark")
    assert res.status_code == 200
    data = res.json()

    assert data["total_samples"] == 124
    assert data["hamming_loss"] < 0.10
    assert data["subset_accuracy"] > 0.40
    assert data["macro_f1"] > 0.70
    assert len(data["per_rule_metrics"]) == 9


def test_iogp_thresholds_endpoint():
    payload = {
        "thresholds": {
            "Confined Space": 0.45,
            "Energy Isolation": 0.42
        }
    }

    res = client.post("/api/v1/iogp/thresholds", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert data["updated"] is True
    assert data["current_thresholds"]["Confined Space"] == 0.45


def test_iogp_status_endpoint():
    res = client.get("/api/v1/iogp/status")
    assert res.status_code == 200
    data = res.json()

    assert data["model_type"] == "IOGPMultiLabelClassifier"
    assert data["rules_count"] == 9
    assert data["is_persisted"] is True
