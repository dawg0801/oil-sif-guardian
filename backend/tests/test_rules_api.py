"""
OIL-SIF Guardian — Deterministic Safety Rules API Integration Tests
Tests /api/v1/rules/evaluate, /catalog, /catalog/{rule_id}, and /stats endpoints.
"""

from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def test_rules_evaluate_high_hazard():
    payload = {
        "narrative": "Fitter entered crude oil storage tank TK-101 without recorded gas test or standby hole watcher.",
        "title": "Tank Entry Without Controls"
    }

    res = client.post("/api/v1/rules/evaluate", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert data["mandatory_high_psif"] is True
    assert data["stop_work_required"] is True
    assert data["severity_level"] == "ZERO_TOLERANCE_FATAL"
    assert data["is_benign"] is False
    assert len(data["triggered_rule_details"]) > 0

    first_rule = data["triggered_rule_details"][0]
    assert "RULE-CS-001" in first_rule["rule_id"]
    assert "Confined Space" == first_rule["iogp_category"]
    assert len(first_rule["regulatory_standard"]) > 0
    assert len(first_rule["stop_work_action"]) > 0

    assert len(data["audit_trail"]) > 0
    assert data["audit_trail"][0]["action_status"] == "VETO_ENFORCED"
    assert data["latency_ms"] >= 0.0


def test_rules_evaluate_benign():
    payload = {
        "narrative": "Office laser printer cleared paper jam and administrative stationery supplies were inventoried.",
        "title": "Stationery Requisition"
    }

    res = client.post("/api/v1/rules/evaluate", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert data["mandatory_high_psif"] is False
    assert data["stop_work_required"] is False
    assert data["is_benign"] is True
    assert data["severity_level"] == "BENIGN_ADMINISTRATIVE"
    assert len(data["audit_trail"]) == 1
    assert data["audit_trail"][0]["action_status"] == "NEGATIVE_CONTROL_SUPPRESSED"


def test_rules_catalog_all():
    res = client.get("/api/v1/rules/catalog")
    assert res.status_code == 200
    data = res.json()

    assert data["total_rules"] >= 35
    assert len(data["rules"]) == data["total_rules"]
    assert "Confined Space" in data["categories"]
    assert "Energy Isolation" in data["categories"]
    assert "Safe Mechanical Lifting" in data["categories"]
    assert "ZERO_TOLERANCE_FATAL" in data["severities"]


def test_rules_catalog_filter_category():
    res = client.get("/api/v1/rules/catalog?category=Confined+Space")
    assert res.status_code == 200
    data = res.json()

    assert data["total_rules"] >= 3
    for r in data["rules"]:
        assert r["iogp_category"] == "Confined Space"


def test_rules_catalog_filter_severity():
    res = client.get("/api/v1/rules/catalog?severity=ZERO_TOLERANCE_FATAL")
    assert res.status_code == 200
    data = res.json()

    assert data["total_rules"] >= 20
    for r in data["rules"]:
        assert r["severity"] == "ZERO_TOLERANCE_FATAL"


def test_rules_get_by_id():
    res = client.get("/api/v1/rules/catalog/RULE-CS-001")
    assert res.status_code == 200
    data = res.json()

    assert data["rule_id"] == "RULE-CS-001"
    assert data["iogp_category"] == "Confined Space"
    assert data["severity"] == "ZERO_TOLERANCE_FATAL"
    assert "OISD" in data["regulatory_standard"]

    # 404 for invalid ID
    res_404 = client.get("/api/v1/rules/catalog/RULE-UNKNOWN-999")
    assert res_404.status_code == 404


def test_rules_stats_benchmark():
    res = client.get("/api/v1/rules/stats")
    assert res.status_code == 200
    data = res.json()

    assert data["total_evaluated"] == 124
    assert data["high_psif_count"] == 80
    assert data["high_psif_recall"] == 1.0  # 100% recall guarantee!
    assert data["zero_tolerance_vetoes"] >= 80
    assert data["benign_suppressions"] >= 10
    assert len(data["top_triggered_rules"]) > 0
    assert len(data["category_distribution"]) > 0
