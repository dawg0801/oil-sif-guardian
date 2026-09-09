"""
Integration tests for Safety NER & Information Extraction API Endpoints.
"""

from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def test_extraction_entities_success():
    payload = {
        "narrative": (
            "During casing hoisting on Drilling Rig OIL-45, workers under suspended load "
            "experienced whip check unlatched and high pressure gas kick of 3500 psi. "
            "Standby attendant absent resulting in potential crush fatality."
        ),
        "activity": "Casing Makeup",
        "site": "OIL-45 Moran"
    }

    res = client.post("/api/v1/extraction/entities", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert data["total_entities"] > 0
    assert "entities_by_category" in data
    assert "causal_flow" in data
    assert len(data["causal_flow"]["steps"]) == 5
    assert data["causal_flow"]["completeness_score"] > 0.5
    assert data["causal_flow"]["risk_level"] in ("HIGH_PSIF", "MEDIUM_PSIF")

    # Verify spans align with narrative
    for span in data["all_spans"]:
        sliced = payload["narrative"][span["start_char"]:span["end_char"]]
        assert sliced == span["text"]


def test_extraction_entities_validation_error():
    # Empty narrative should fail
    res = client.post("/api/v1/extraction/entities", json={"narrative": "   "})
    assert res.status_code in (400, 422)


def test_bio_tagging_endpoint():
    payload = {
        "narrative": "Contractor entered inside separator vessel at EPS-1 with gas test omitted."
    }

    res = client.post("/api/v1/extraction/bio-tag", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert data["total_tokens"] > 0
    assert data["entity_tokens_count"] > 0
    assert "conll_format" in data
    assert len(data["tokens"]) == data["total_tokens"]


def test_taxonomy_endpoint():
    res = client.get("/api/v1/extraction/taxonomy")
    assert res.status_code == 200
    data = res.json()

    assert len(data["supported_categories"]) == 8
    assert data["builtin_terms_count"] > 100
    assert data["trie_entries_loaded"] > 100
    assert "ACTIVITY" in data["category_descriptions"]
    assert "CREDIBLE_CONSEQUENCE" in data["category_descriptions"]
