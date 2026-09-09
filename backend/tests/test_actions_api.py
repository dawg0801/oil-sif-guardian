"""
Integration Tests for Corrective Action Management Endpoints.
"""

from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def _create_report_for_action():
    payload = {
        "report_type": "near_miss",
        "site": "Digboi Refinery Area",
        "location": "Crude Distillation Unit 1",
        "department": "Inspection & Reliability",
        "activity": "Flange Integrity Audit",
        "reporter_role": "Corrosion Engineer",
        "narrative": "Ultrasonic thickness measurement identified severe localized pitting below minimum wall thickness on fuel gas line."
    }
    res = client.post("/api/v1/reports", json=payload)
    assert res.status_code == 201
    return res.json()["report_id"]


def test_create_and_list_actions():
    report_id = _create_report_for_action()

    # Create action
    create_payload = {
        "title": "Install temporary engineered clamp and fabricate spool replacement",
        "assigned_to": "Mechanical Maintenance Superintendent",
        "due_date": "2026-09-25",
        "status": "OPEN",
        "notes": "Clamp rated for 150# class required until planned turnaround."
    }
    create_res = client.post(f"/api/v1/reports/{report_id}/actions", json=create_payload)
    assert create_res.status_code == 201
    act = create_res.json()
    assert act["action_id"].startswith("ACT-")
    assert act["status"] == "OPEN"
    assert act["report_id"] == report_id
    action_id = act["action_id"]

    # List actions for specific report
    rep_list_res = client.get(f"/api/v1/reports/{report_id}/actions")
    assert rep_list_res.status_code == 200
    acts = rep_list_res.json()
    assert len(acts) >= 1
    assert any(a["action_id"] == action_id for a in acts)

    # List all enterprise actions
    all_res = client.get("/api/v1/reports/actions/all?status=OPEN")
    assert all_res.status_code == 200
    all_acts = all_res.json()
    assert isinstance(all_acts, list)
    assert any(a["action_id"] == action_id for a in all_acts)

    # Update action to IN_PROGRESS
    patch_res = client.patch(
        f"/api/v1/reports/actions/{action_id}",
        json={"status": "IN_PROGRESS", "notes": "Clamp installed; ultrasonic leak check confirmed zero hydrocarbon emission."}
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "IN_PROGRESS"
    assert patch_res.json()["closed_at"] is None

    # Verify closure of action
    close_res = client.patch(
        f"/api/v1/reports/actions/{action_id}",
        json={
            "status": "VERIFIED_CLOSED",
            "verification_notes": "Permanent spool replacement installed and hydrotested to 1.5x design pressure.",
            "verified_by": "Chief Inspection Engineer"
        }
    )
    assert close_res.status_code == 200
    assert close_res.json()["status"] == "VERIFIED_CLOSED"
    assert close_res.json()["closed_at"] is not None

    # Test actions stats endpoint
    stats_res = client.get("/api/v1/reports/actions/stats")
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["total_actions"] >= 1
    assert stats["verified_closed_count"] >= 1
    assert "closure_rate" in stats
