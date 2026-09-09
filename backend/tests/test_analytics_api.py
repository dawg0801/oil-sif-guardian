"""
Integration tests for Executive Analytics, Emerging Risks, and Statutory Compliance API.
"""

from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def test_analytics_overview():
    res = client.get("/api/v1/analytics/overview")
    assert res.status_code == 200
    data = res.json()
    assert "total_reports" in data
    assert "high_psif_count" in data
    assert "psif_rate_percent" in data
    assert "pending_reviews" in data
    assert "open_corrective_actions" in data
    assert isinstance(data["top_life_saving_rules"], list)


def test_analytics_trends_and_emerging_risks():
    res = client.get("/api/v1/analytics/trends")
    assert res.status_code == 200
    data = res.json()
    assert "temporal_trends" in data
    assert len(data["temporal_trends"]) >= 5
    first_month = data["temporal_trends"][0]
    assert "month" in first_month
    assert "total" in first_month
    assert "high_psif" in first_month

    assert "emerging_risks" in data
    assert len(data["emerging_risks"]) >= 2
    for risk in data["emerging_risks"]:
        assert "category" in risk
        assert "metric" in risk
        assert "severity" in risk
        assert "recommendation" in risk


def test_analytics_clusters():
    res = client.get("/api/v1/analytics/clusters")
    assert res.status_code == 200
    data = res.json()
    assert "total_clusters" in data
    assert "clusters" in data
    assert len(data["clusters"]) >= 1
    for c in data["clusters"]:
        assert "cluster_id" in c
        assert "theme" in c
        assert "dominant_rule" in c or "primary_iogp_rule" in c
        assert "exposure_fingerprint" in c


def test_statutory_compliance_summary():
    res = client.get("/api/v1/analytics/compliance-summary")
    assert res.status_code == 200
    data = res.json()
    assert data["standards_monitored"] >= 6
    assert data["overall_guardrail_shield_rate"] == 100.0
    assert "frameworks" in data
    codes = [fw["code"] for fw in data["frameworks"]]
    assert "OISD-105" in codes
    assert "OISD-114" in codes
    assert "DGMS (OMR-2017)" in codes
    assert "Factories Act 1948" in codes
    for fw in data["frameworks"]:
        assert fw["status"] == "SHIELDED"
        assert fw["veto_enforced"] is True
