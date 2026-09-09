"""
Pydantic schemas for Safety Ontology, Barrier Taxonomies, and SIF Fingerprints.
"""

from typing import Dict, List, Optional

from pydantic import BaseModel


class BarrierDefinitionSchema(BaseModel):
    id: str
    name: str
    category: str
    sub_type: str
    description: str
    iogp_rule_association: str


class DetectedBarrierSchema(BaseModel):
    barrier_id: str
    name: str
    category: str
    sub_type: str
    state: str
    evidence: str
    severity_weight: float


class BarrierAnalysisResponse(BaseModel):
    detected_barriers: List[DetectedBarrierSchema]
    barrier_health_score: float
    has_critical_failure: bool
    summary_by_category: Dict[str, Dict[str, int]]
    failure_mechanisms: List[str]
    sif_barrier_flag: str


class SIFFingerprintRequest(BaseModel):
    narrative: str
    activity: Optional[str] = "Operations"
    site: Optional[str] = "OIL Facility"
    title: Optional[str] = ""


class SIFFingerprintResponse(BaseModel):
    fingerprint: str
    activity: str
    hazardous_energy: str
    hazard: str
    barrier_failure: str
    iogp_rule: str
    explanation: str


class RegulatoryFrameworkSchema(BaseModel):
    code: str
    title: str
    mandate: str


class OntologyTermsResponse(BaseModel):
    abbreviations: Dict[str, str]
    oil_facilities: List[str]
    oil_operating_areas: List[str]
    equipment: List[str]
    hazards: List[str]
    failure_modes: List[str]
    energy_sources: Dict[str, List[str]]
    regulatory_frameworks: List[RegulatoryFrameworkSchema]
