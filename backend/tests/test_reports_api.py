"""
API Integration Tests for Reports, Review, and Actions Workflows.
"""

from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def test_canonical_confined_space_triage_flow():
    # 1. Ingest Canonical Tank Scenario
    payload = {
        "report_type": "near_miss",
        "site": "Duliajan Production Installation",
        "location": "Separator Station #4",
        "department": "Mechanical Maintenance",
        "activity": "Separator Vessel Inspection",
        "equipment": ["Gas Separator V-102"],
        "reporter_role": "Lead Operator",
        "narrative": (
            "During maintenance, a contractor entered the tank to inspect an internal valve. "
            "Gas testing was not recorded, the entry permit had expired, and no attendant was positioned outside."
        )
    }

    create_res = client.post("/api/v1/reports", json=payload)
    assert create_res.status_code == 201
    data = create_res.json()

    assert data["report_id"].startswith("OIL-")
    assert data["psif"]["priority"] == "HIGH"
    assert data["psif"]["probability"] >= 0.85
    assert data["psif"]["confidence"] == "HIGH"

    # Verify IOGP rules
    rule_names = [r["rule_name"] for r in data["life_saving_rules"]]
    assert "Confined Space" in rule_names
    assert "Work Authorization" in rule_names

    # Verify Evidence Spans
    assert len(data["evidence_spans"]) > 0
    span_categories = [s["category"] for s in data["evidence_spans"]]
    assert "EXPOSURE" in span_categories
    assert "CONTROL_FAILURE" in span_categories

    report_id = data["report_id"]

    # 2. Retrieve by report_id
    get_res = client.get(f"/api/v1/reports/{report_id}")
    assert get_res.status_code == 200
    get_data = get_res.json()
    assert get_data["report_id"] == report_id
    assert get_data["review"]["status"] == "PENDING"

    # 3. Submit HSE Human Review
    review_payload = {
        "reviewer_id": "HSE-LEAD-901",
        "status": "CONFIRMED",
        "final_psif_label": "HIGH",
        "reviewer_notes": "Immediate safety stand-down invoked. Contractor permit auditing initiated."
    }
    rev_res = client.post(f"/api/v1/reports/{report_id}/review", json=review_payload)
    assert rev_res.status_code == 200
    rev_data = rev_res.json()
    assert rev_data["status"] == "CONFIRMED"
    assert rev_data["reviewer_id"] == "HSE-LEAD-901"

    # 4. Create Corrective Action
    action_payload = {
        "title": "Perform 100% audit of site gas testers & renew confined space certificates",
        "assigned_to": "Field Operations Superintendent",
        "due_date": "2026-09-15",
        "status": "OPEN",
        "notes": "Mandatory retraining for all vessel entry attendants."
    }
    act_res = client.post(f"/api/v1/reports/{report_id}/actions", json=action_payload)
    assert act_res.status_code == 201
    act_data = act_res.json()
    assert act_data["action_id"].startswith("ACT-")
    assert act_data["status"] == "OPEN"

    # 5. Verify Analytics Overview updates
    analytics_res = client.get("/api/v1/analytics/overview")
    assert analytics_res.status_code == 200
    analytics_data = analytics_res.json()
    assert analytics_data["total_reports"] >= 1
    assert analytics_data["high_psif_count"] >= 1

    # 6. Verify Semantic Similarity Retrieval
    sim_res = client.get(f"/api/v1/reports/{report_id}/similar?top_k=3")
    assert sim_res.status_code == 200
    sim_data = sim_res.json()
    assert sim_data["report_id"] == report_id
    assert "similar_precursors" in sim_data
    assert len(sim_data["similar_precursors"]) > 0

    # 7. Verify Ad-hoc Similarity Search
    search_res = client.post(
        "/api/v1/reports/search/similarity",
        json={"narrative": "Internal vessel inspection without breathing apparatus and absent attendant.", "top_k": 3}
    )
    assert search_res.status_code == 200
    search_data = search_res.json()
    assert search_data["total_matches"] > 0

