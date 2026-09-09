"""
Pydantic schemas for Precursor Clusters and Network Graph Topology.
"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class PrecursorClusterSchema(BaseModel):
    cluster_id: str
    theme: str
    primary_iogp_rule: str
    exposure_fingerprint: str
    common_failure: str
    hazard: str
    reports_count: int
    high_psif_count: int
    recurrence_score: float
    affected_facilities: List[str]
    facility_count: int
    barrier_breakdowns: Dict[str, int]
    sample_incidents: List[Dict[str, Any]]


class ClusterGraphNodeSchema(BaseModel):
    id: str
    label: str
    type: str  # CLUSTER, ASSET, BARRIER, INCIDENT
    category: str
    val: float
    priority: str
    fingerprint: Optional[str] = ""


class ClusterGraphLinkSchema(BaseModel):
    source: str
    target: str
    relation: str
    weight: float


class ClusterGraphResponse(BaseModel):
    nodes: List[ClusterGraphNodeSchema]
    links: List[ClusterGraphLinkSchema]
    total_nodes: int
    total_links: int
    cluster_count: int
