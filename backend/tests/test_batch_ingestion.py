"""
Integration Tests for Batch and CSV Ingestion Endpoints and Data Quality Summary.
"""

from pathlib import Path

from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def test_batch_json_ingestion():
    payload = {
        "reports": [
            {
                "report_type": "near_miss",
                "site": "Duliajan Production Installation",
                "location": "Separator Station #4",
                "department": "Production",
                "activity": "Separator Inspection",
                "narrative": "Contractor entered separator vessel without gas testing or permit. Attendant was absent."
            },
            {
                "report_type": "unsafe_act",
                "site": "Digboi Refinery Plant",
                "location": "Distillation Unit #2",
                "department": "Operations",
                "activity": "Working at height",
                "narrative": "Scaffolder working at 12 meters height without securing safety harness lanyard to lifeline."
            }
        ]
    }
    response = client.post("/api/v1/reports/batch", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["total_processed"] == 2
    assert data["successful_count"] == 2
    assert len(data["items"]) == 2
    assert data["average_quality_score"] > 0
    assert data["items"][0]["status"] in ["SUCCESS", "DUPLICATE_WARNING"]
    assert data["items"][0]["quality_score"] > 0
    assert data["items"][0]["priority"] in ["HIGH", "LOW", "REVIEW"]


def test_upload_csv_dataset():
    sample_csv_path = Path(__file__).resolve().parents[2] / "data" / "samples" / "curated_oil_incidents.csv"
    assert sample_csv_path.exists()

    with open(sample_csv_path, "rb") as f:
        response = client.post(
            "/api/v1/reports/upload-csv",
            files={"file": ("curated_oil_incidents.csv", f, "text/csv")}
        )

    assert response.status_code == 201
    data = response.json()
    assert data["total_processed"] >= 50
    assert data["successful_count"] >= 50
    assert data["failed_count"] == 0
    assert data["average_quality_score"] >= 50.0
    assert "A" in data["grade_breakdown"]


def test_get_data_quality_summary():
    response = client.get("/api/v1/reports/quality-summary")
    assert response.status_code == 200
    data = response.json()
    assert data["total_reports"] > 0
    assert data["average_quality_score"] > 0
    assert "A" in data["grade_distribution"]
    assert "narrative_depth" in data["dimension_averages"]
    assert isinstance(data["common_issues"], list)
