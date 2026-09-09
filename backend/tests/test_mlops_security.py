"""
Tests for Phase 16 (MLOps & Governance) and Phase 17 (Enterprise Security & RBAC).
"""

from fastapi.testclient import TestClient

from backend.app.core.security import sanitize_narrative
from backend.app.main import app

client = TestClient(app)


def test_get_model_drift():
    """Verifies MLOps drift monitoring endpoint returns valid PSI and distribution metrics."""
    res = client.get("/api/v1/models/drift")
    assert res.status_code == 200
    data = res.json()
    assert "status" in data
    assert "drift_level" in data
    assert "population_stability_index" in data
    assert isinstance(data["population_stability_index"], float)
    assert "class_distribution" in data
    assert "confidence_metrics" in data
    assert "safety_guardrail_status" in data


def test_get_model_card():
    """Verifies IEEE/Google Model Card endpoint returns structured metadata and safety targets."""
    res = client.get("/api/v1/models/card")
    assert res.status_code == 200
    data = res.json()
    assert "model_details" in data
    assert data["model_details"]["name"] == "OIL-SIF Guardian Hybrid Contextual Prioritizer"
    assert "intended_use" in data
    assert "safety_targets_and_benchmarks" in data
    assert data["safety_targets_and_benchmarks"]["high_psif_recall"] == "100.0%"
    assert "ethical_and_privacy_controls" in data


def test_get_model_governance():
    """Verifies operational governance and compliance thresholds endpoint."""
    res = client.get("/api/v1/models/governance")
    assert res.status_code == 200
    data = res.json()
    assert data["governance_status"] == "COMPLIANT"
    assert "active_thresholds" in data
    assert data["active_thresholds"]["psif_high_threshold"] == 0.70
    assert data["active_thresholds"]["rule_2_veto_enforced"] is True
    assert "regulatory_frameworks" in data
    assert len(data["regulatory_frameworks"]) >= 4


def test_security_audit_endpoint():
    """Verifies statutory platform security audit report."""
    res = client.get("/api/v1/security/audit")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SECURE"
    assert "active_defenses" in data
    assert data["active_defenses"]["pii_redaction_filter"] == "Active (Deterministic Name & Phone Masking)"
    assert data["active_defenses"]["rule_2_tamper_shield"] == "Active (Downgrades Blocked without Executive Credential)"


def test_security_roles_endpoint():
    """Verifies RBAC role hierarchy and permission tiers."""
    res = client.get("/api/v1/security/roles")
    assert res.status_code == 200
    data = res.json()
    assert "roles" in data
    assert "CHIEF_SAFETY_OFFICER" in data["roles"]
    assert "FIELD_REPORTER" in data["roles"]
    assert "hierarchy_levels" in data


def test_security_me_endpoint():
    """Verifies caller identity resolution and role capabilities."""
    # Test as Chief Safety Officer
    res = client.get("/api/v1/security/me", headers={"X-User-Role": "CHIEF_SAFETY_OFFICER", "X-User-Id": "CSO-01"})
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "CHIEF_SAFETY_OFFICER"
    assert data["is_executive"] is True
    assert data["can_override_veto"] is True

    # Test as Field Reporter
    res_field = client.get("/api/v1/security/me", headers={"X-User-Role": "FIELD_REPORTER", "X-User-Id": "REP-01"})
    assert res_field.status_code == 200
    data_field = res_field.json()
    assert data_field["role"] == "FIELD_REPORTER"
    assert data_field["is_executive"] is False
    assert data_field["can_override_veto"] is False


def test_security_response_headers():
    """Verifies HTTP security headers injected on API responses."""
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    assert res.headers.get("X-Content-Type-Options") == "nosniff"
    assert res.headers.get("X-Frame-Options") == "DENY"
    assert "max-age" in res.headers.get("Strict-Transport-Security", "")
    assert res.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"


def test_narrative_sanitization():
    """Verifies input sanitization strips dangerous HTML/scripts while preserving text."""
    dirty_text = "<script>alert('pwned')</script>Worker entered separator V-102 without permit.<iframe src='evil.com'></iframe>"
    cleaned = sanitize_narrative(dirty_text)
    assert "<script>" not in cleaned
    assert "<iframe>" not in cleaned
    assert "alert" not in cleaned
    assert "Worker entered separator V-102 without permit." in cleaned
