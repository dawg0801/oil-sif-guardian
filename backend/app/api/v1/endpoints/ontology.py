"""
FastAPI router for Domain Ontology, Hierarchical Barriers, and SIF Exposure Fingerprinting.
"""

import json
import os
from typing import Dict, List

from fastapi import APIRouter, HTTPException

from backend.app.schemas.ontology import (
    BarrierAnalysisResponse,
    BarrierDefinitionSchema,
    DetectedBarrierSchema,
    OntologyTermsResponse,
    SIFFingerprintRequest,
    SIFFingerprintResponse,
)
from backend.app.services.precursor_cluster_service import precursor_cluster_service
from rules.barriers.barrier_taxonomy import barrier_analyzer

router = APIRouter()

TERMS_PATH = os.path.join("rules", "dictionaries", "safety_terms.json")


@router.get("/terms", response_model=OntologyTermsResponse)
def get_ontology_terms():
    """
    Returns OIL operational facilities, operating areas, equipment, hazards, failure modes,
    abbreviations, and Indian regulatory safety frameworks (OISD, DGMS, PNGRB).
    """
    if not os.path.exists(TERMS_PATH):
        raise HTTPException(status_code=404, detail="Safety terms dictionary not found")

    with open(TERMS_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    return OntologyTermsResponse(
        abbreviations=data.get("abbreviations", {}),
        oil_facilities=data.get("oil_facilities", []),
        oil_operating_areas=data.get("oil_operating_areas", []),
        equipment=data.get("equipment", []),
        hazards=data.get("hazards", []),
        failure_modes=data.get("failure_modes", []),
        energy_sources=data.get("energy_sources", {}),
        regulatory_frameworks=data.get("regulatory_frameworks", [])
    )


@router.get("/barriers", response_model=List[BarrierDefinitionSchema])
def get_barrier_definitions():
    """
    Returns the formal hierarchical catalog of Hardware, Administrative,
    and Human Action safety barriers.
    """
    results = []
    for b in barrier_analyzer.BARRIER_CATALOG.values():
        results.append(BarrierDefinitionSchema(
            id=b.id,
            name=b.name,
            category=b.category.value,
            sub_type=b.sub_type,
            description=b.description,
            iogp_rule_association=b.iogp_rule_association
        ))
    return results


@router.post("/analyze-barriers", response_model=BarrierAnalysisResponse)
def analyze_incident_barriers(payload: Dict[str, str]):
    """
    Analyzes an incident narrative to detect manifested barriers, determine
    degradation states (EFFECTIVE, DEGRADED, FAILED, BYPASSED, ABSENT),
    and compute the quantitative Barrier Health Index.
    """
    narrative = payload.get("narrative", "")
    if not narrative.strip():
        raise HTTPException(status_code=422, detail="Narrative text is required")

    analysis = barrier_analyzer.analyze(narrative)

    detected_schemas = [
        DetectedBarrierSchema(
            barrier_id=b.barrier_id,
            name=b.name,
            category=b.category.value,
            sub_type=b.sub_type,
            state=b.state.value,
            evidence=b.evidence,
            severity_weight=b.severity_weight
        )
        for b in analysis.detected_barriers
    ]

    return BarrierAnalysisResponse(
        detected_barriers=detected_schemas,
        barrier_health_score=analysis.barrier_health_score,
        has_critical_failure=analysis.has_critical_failure,
        summary_by_category=analysis.summary_by_category,
        failure_mechanisms=analysis.failure_mechanisms,
        sif_barrier_flag=analysis.sif_barrier_flag
    )


@router.post("/fingerprint", response_model=SIFFingerprintResponse)
def generate_sif_fingerprint(payload: SIFFingerprintRequest):
    """
    Derives the standardized 5-tuple SIF Exposure Fingerprint:
    [ACTIVITY] | [HAZARDOUS ENERGY] | [HAZARD] | [BARRIER FAILURE] | [IOGP RULE]
    """
    if not payload.narrative.strip():
        raise HTTPException(status_code=422, detail="Narrative text is required")

    fp = precursor_cluster_service.generate_fingerprint(
        narrative=payload.narrative,
        activity=payload.activity or "Operations",
        site=payload.site or "OIL Facility",
        title=payload.title or ""
    )

    explanation = (
        f"Activity '{fp.activity}' involving {fp.hazardous_energy} energy exposed workers to "
        f"'{fp.hazard}' due to '{fp.barrier_failure}', violating IOGP rule '{fp.iogp_rule}'."
    )

    return SIFFingerprintResponse(
        fingerprint=fp.raw_fingerprint,
        activity=fp.activity,
        hazardous_energy=fp.hazardous_energy,
        hazard=fp.hazard,
        barrier_failure=fp.barrier_failure,
        iogp_rule=fp.iogp_rule,
        explanation=explanation
    )
