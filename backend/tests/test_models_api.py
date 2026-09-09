"""
API Integration tests for Contextual Sequence Model, Attribution, and Ensemble Endpoints.
"""

from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def test_models_predict_endpoint():
    payload = {
        "narrative": "Vessel cleanout at EPS-1 with h2s gas and omitted gas test causing fatal asphyxiation."
    }

    res = client.post("/api/v1/models/predict", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert data["predicted_class"] == "HIGH"
    assert "calibrated_probabilities" in data
    assert data["calibrated_probabilities"]["HIGH"] > 0.5
    assert len(data["top_iogp_rules"]) > 0


def test_models_attribution_endpoint():
    payload = {
        "narrative": "High pressure kick of 3500 psi with whip check unlatched causing blowout."
    }

    res = client.post("/api/v1/models/attribution", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert len(data["tokens"]) > 0
    assert len(data["top_risk_amplifiers"]) > 0
    assert data["saliency_balance"] > 0


def test_models_ensemble_endpoint():
    payload = {
        "narrative": "Contractor entered tank without gas test or entry permit."
    }

    res = client.post("/api/v1/models/ensemble", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert data["final_priority"] == "HIGH"
    assert "rule_engine_decision" in data
    assert "tfidf_decision" in data
    assert "contextual_decision" in data


def test_models_status_endpoint():
    res = client.get("/api/v1/models/status")
    assert res.status_code == 200
    data = res.json()

    assert "model_version" in data
    assert len(data["supported_rules"]) == 9
    assert data["temperature"] > 0


def test_models_benchmark_endpoint():
    res = client.get("/api/v1/models/benchmark")
    assert res.status_code == 200
    data = res.json()

    assert data["total_benchmark_samples"] == 124
    assert data["tri_model_ensemble"]["high_psif_recall"] == 1.0
    assert "key_findings" in data
