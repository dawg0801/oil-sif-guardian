"""
Integration tests for Phase 3 API endpoints (ontology, clusters, and baseline modeling).
"""

from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def test_get_ontology_terms():
    response = client.get("/api/v1/ontology/terms")
    assert response.status_code == 200
    data = response.json()
    assert "abbreviations" in data
    assert "oil_facilities" in data
    assert "oil_operating_areas" in data
    assert "regulatory_frameworks" in data
    assert len(data["oil_facilities"]) >= 15


def test_get_barrier_definitions():
    response = client.get("/api/v1/ontology/barriers")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 8
    categories = {b["category"] for b in data}
    assert "HARDWARE" in categories
    assert "ADMINISTRATIVE" in categories
    assert "HUMAN_ACTION" in categories


def test_analyze_barriers_endpoint():
    payload = {
        "narrative": "Worker stepped inside the crude separator at EPS-1 without gas testing and attendant was absent."
    }
    response = client.post("/api/v1/ontology/analyze-barriers", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["has_critical_failure"] is True
    assert data["sif_barrier_flag"] == "CRITICAL_FAILURE"
    assert data["barrier_health_score"] < 0.60
    assert len(data["detected_barriers"]) >= 1


def test_generate_fingerprint_endpoint():
    payload = {
        "narrative": "During wellhead maintenance on Rig OIL-45, technician opened 350 psi flowline without LOTO.",
        "activity": "Wellhead Maintenance",
        "site": "Drilling Rig OIL-45",
        "title": "Unbolting Flowline"
    }
    response = client.post("/api/v1/ontology/fingerprint", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "fingerprint" in data
    assert "WELLHEAD" in data["activity"]
    assert "PRESSURE" in data["hazardous_energy"]
    assert "Energy Isolation" in data["iogp_rule"]
    assert len(data["fingerprint"].split("|")) == 5


def test_get_precursor_clusters_endpoint():
    response = client.get("/api/v1/clusters/precursors")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    cluster = data[0]
    assert "cluster_id" in cluster
    assert "theme" in cluster
    assert "exposure_fingerprint" in cluster
    assert "common_failure" in cluster


def test_get_precursor_graph_endpoint():
    response = client.get("/api/v1/clusters/graph")
    assert response.status_code == 200
    data = response.json()
    assert "nodes" in data
    assert "links" in data
    assert data["total_nodes"] > 0
    assert data["total_links"] > 0


def test_get_baseline_status():
    response = client.get("/api/v1/baseline/status")
    assert response.status_code == 200
    data = response.json()
    assert "is_trained" in data
    assert "vocabulary_size" in data


def test_train_baseline_model():
    response = client.post("/api/v1/baseline/train", json={"use_golden_benchmark": True, "use_db_reports": True})
    assert response.status_code == 200
    data = response.json()
    assert data["is_trained"] is True
    assert data["vocabulary_size"] > 0


def test_evaluate_baseline_comparison():
    response = client.post("/api/v1/baseline/evaluate")
    assert response.status_code == 200
    data = response.json()
    assert "deterministic_rule_engine" in data
    assert "tfidf_baseline" in data
    assert "calibrated_hybrid" in data
    assert "key_findings" in data
    assert data["calibrated_hybrid"]["high_psif_recall"] >= 0.95
