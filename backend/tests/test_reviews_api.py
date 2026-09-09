"""
Integration Tests for Reviews and HITL Adjudication API Endpoints.
"""

from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def _create_sample_report(narrative: str, site: str = "Duliajan Asset"):
    payload = {
        "report_type": "near_miss",
        "site": site,
        "location": "Wellhead Platform 03",
        "department": "Production Operations",
        "activity": "Routine Maintenance",
        "reporter_role": "Site Safety Officer",
        "narrative": narrative
    }
    res = client.post("/api/v1/reports", json=payload)
    assert res.status_code == 201
    return res.json()


def test_adjudicate_confirmed_success():
    report_data = _create_sample_report(
        "Contractor entered vessel without gas test. Entry permit was expired and attendant was missing."
    )
    report_id = report_data["report_id"]

    adj_payload = {
        "report_id": report_id,
        "reviewer_id": "HSE-OFFICER-101",
        "reviewer_role": "HSE_OFFICER",
        "decision": "CONFIRMED",
        "final_priority": "HIGH",
        "final_primary_rule": "Confined Space",
        "final_secondary_rules": ["Work Authorization"],
        "barrier_failures": ["Administrative Control", "Gas Testing Barrier"],
        "statutory_tags": ["OISD-105", "DGMS (OMR-2017)"],
        "reviewer_notes": "Confirmed high SIF potential. Immediate job stop order issued on site.",
        "create_corrective_action": False
    }

    res = client.post("/api/v1/reviews/adjudicate", json=adj_payload)
    assert res.status_code == 200
    data = res.json()

    assert data["report_id"] == report_id
    assert data["decision"] == "CONFIRMED"
    assert data["final_priority"] == "HIGH"
    assert data["is_veto_enforced"] is True
    assert data["veto_override_approved"] is False
    assert data["audit_event_id"] is not None


def test_adjudicate_veto_downgrade_blocked_for_standard_role():
    report_data = _create_sample_report(
        "Rigger entered active drop zone under suspended load while crane was slewing over rig floor."
    )
    report_id = report_data["report_id"]

    adj_payload = {
        "report_id": report_id,
        "reviewer_id": "HSE-OFFICER-102",
        "reviewer_role": "HSE_OFFICER",
        "decision": "MODIFIED",
        "final_priority": "LOW",
        "override_reason_code": "ENERGY_MITIGATED",
        "reviewer_notes": "Rigger moved out of the way quickly before hook descended.",
    }

    res = client.post("/api/v1/reviews/adjudicate", json=adj_payload)
    assert res.status_code == 422
    assert "Statutory Safety Veto Invariant" in res.json()["detail"]


def test_adjudicate_veto_downgrade_approved_by_senior_signoff():
    report_data = _create_sample_report(
        "Welder struck arc near crude oil manifold without verified hot work permit and without fire watch."
    )
    report_id = report_data["report_id"]

    adj_payload = {
        "report_id": report_id,
        "reviewer_id": "HSE-OFFICER-103",
        "reviewer_role": "HSE_OFFICER",
        "decision": "MODIFIED",
        "final_priority": "REVIEW",
        "senior_signoff_by": "HSE-LEAD-CHIEF-01",
        "override_reason_code": "PHYSICAL_ISOLATION_CONFIRMED",
        "reviewer_notes": "Verified manifold was completely blinded, air-gapped, and hydrocarbon lines purged to 0 LEL by HSE Lead.",
        "create_corrective_action": True,
        "action_title": "Update hot work permit documentation and checklist",
        "action_assignee": "Mechanical Maintenance Superintendent",
        "action_due_date": "2026-09-30"
    }

    res = client.post("/api/v1/reviews/adjudicate", json=adj_payload)
    assert res.status_code == 200
    data = res.json()

    assert data["report_id"] == report_id
    assert data["final_priority"] == "REVIEW"
    assert data["veto_override_approved"] is True
    assert data["action_id"] is not None
    assert data["action_id"].startswith("ACT-")


def test_get_pending_reviews_endpoint():
    res = client.get("/api/v1/reviews/pending?limit=10")
    assert res.status_code == 200
    items = res.json()
    assert isinstance(items, list)
    if items:
        item = items[0]
        assert "report_id" in item
        assert "ai_priority" in item
        assert "psif_probability" in item
        assert "is_veto_enforced" in item
        assert "days_pending" in item


def test_get_review_history_endpoint():
    res = client.get("/api/v1/reviews/history?limit=10")
    assert res.status_code == 200
    items = res.json()
    assert isinstance(items, list)
    if items:
        item = items[0]
        assert "report_id" in item
        assert "decision" in item
        assert "final_priority" in item


def test_get_review_metrics_endpoint():
    res = client.get("/api/v1/reviews/metrics")
    assert res.status_code == 200
    data = res.json()
    assert "total_reports" in data
    assert "pending_count" in data
    assert "agreement_rate" in data
    assert "drift_status" in data
    assert "priority_transitions" in data
    assert "recommendations" in data


def test_legacy_submit_review_backward_compatibility():
    report_data = _create_sample_report(
        "Technician slipped on wet muddy catwalk while carrying grease gun. Minor bruised knee."
    )
    report_id = report_data["report_id"]

    legacy_payload = {
        "reviewer_id": "HSE-AUDITOR-99",
        "status": "CONFIRMED",
        "final_psif_label": "LOW",
        "reviewer_notes": "First aid administered; catwalk non-slip grating scheduled for cleaning."
    }

    res = client.post(f"/api/v1/reports/{report_id}/review", json=legacy_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["report_id"] == report_id
    assert data["status"] == "CONFIRMED"
    assert data["final_psif_label"] == "LOW"
