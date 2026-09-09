"""
OIL-SIF Guardian — Hybrid Decision Engine API Integration Tests
Tests /api/v1/decision/triage, /calibration, /tune-weights, and /status endpoints.
"""

from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def test_decision_triage_high_hazard():
    payload = {
        "narrative": "Fitter unbolted wellhead casing wing valve with 1200 psi trapped pressure without verified LOTO or bleed-off.",
        "title": "Wellhead Casing Wing Valve Intervention"
    }

    res = client.post("/api/v1/decision/triage", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert data["priority"] == "HIGH"
    assert data["fused_psif_probability"] == 1.0
    assert data["is_veto_enforced"] is True
    assert data["is_benign"] is False
    assert len(data["decision_rationale"]) > 0
    assert len(data["model_contributions"]) > 0
    assert data["primary_iogp_rule"] in ["Energy Isolation", "Line of Fire"]
    assert data["latency_ms"] >= 0.0


def test_decision_triage_benign():
    payload = {
        "narrative": "Accounts clerk replaced cyan toner cartridge in laser printer on 2nd floor administrative block."
    }

    res = client.post("/api/v1/decision/triage", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert data["priority"] == "LOW"
    assert data["fused_psif_probability"] < 0.05
    assert data["is_veto_enforced"] is False
    assert data["is_benign"] is True
    assert data["primary_iogp_rule"] == "None"


def test_decision_calibration_endpoint():
    res = client.get("/api/v1/decision/calibration")
    assert res.status_code == 200
    data = res.json()

    assert data["total_samples"] == 124
    assert data["true_high_psif_count"] == 80
    assert data["detected_high_psif_count"] == 80
    assert data["high_psif_recall"] == 1.0  # 100% recall guarantee!
    assert data["ece"] < 0.20
    assert data["brier_score"] < 0.15
    assert len(data["bins"]) == 10
    assert "active_weights" in data
    assert "active_thresholds" in data


def test_decision_tune_weights_endpoint():
    payload = {
        "sequence_weight": 0.60,
        "iogp_weight": 0.25,
        "tfidf_weight": 0.15,
        "tau_high": 0.52,
        "tau_low": 0.22,
        "temperature": 1.30
    }

    res = client.post("/api/v1/decision/tune-weights", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert data["updated"] is True
    assert data["current_weights"]["sequence_weight"] == 0.60
    assert data["current_weights"]["iogp_weight"] == 0.25
    assert data["current_weights"]["tfidf_weight"] == 0.15
    assert data["current_weights"]["tau_high"] == 0.52
    assert data["current_weights"]["temperature"] == 1.30


def test_decision_status_endpoint():
    res = client.get("/api/v1/decision/status")
    assert res.status_code == 200
    data = res.json()

    assert data["engine_name"] == "CalibratedHybridDecisionEngine"
    assert data["zero_tolerance_enforced"] is True
    assert "deterministic_rule_engine" in data["models_loaded"]
    assert "active_weights" in data
    assert "active_thresholds" in data
