"""
FastAPI router for Systemic Precursor Clusters and Network Graph Topology.
"""

import json
import os
from typing import Any, Dict, List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.models.report import ReportModel
from backend.app.schemas.cluster import (
    ClusterGraphLinkSchema,
    ClusterGraphNodeSchema,
    ClusterGraphResponse,
    PrecursorClusterSchema,
)
from backend.app.services.precursor_cluster_service import precursor_cluster_service

router = APIRouter()
BENCHMARK_PATH = os.path.join("data", "evaluation", "golden_benchmark.json")


def _gather_incidents(db: Session) -> List[Dict[str, Any]]:
    """
    Combines database reports and canonical golden benchmark cases to provide
    a rich cross-asset dataset for recurrence and cluster discovery.
    """
    incidents = []

    # 1. Fetch DB reports
    db_reports = db.query(ReportModel).all()
    for r in db_reports:
        p_val = r.prediction.priority if r.prediction else "LOW"
        incidents.append({
            "id": r.report_id,
            "title": f"Incident at {r.site} ({r.activity or 'Operations'})",
            "text": r.normalized_text or r.raw_text,
            "activity": r.activity or "Operations",
            "site": r.site or "OIL Facility",
            "priority": p_val
        })

    # 2. Add canonical benchmark cases if DB has few events
    if len(incidents) < 20 and os.path.exists(BENCHMARK_PATH):
        with open(BENCHMARK_PATH, "r", encoding="utf-8") as f:
            benchmarks = json.load(f)
        for b in benchmarks:
            gt = b.get("ground_truth", {})
            incidents.append({
                "id": b.get("benchmark_id", "BM"),
                "title": b.get("title", ""),
                "text": b.get("narrative", ""),
                "activity": b.get("activity", "Operations"),
                "site": b.get("site", "OIL Operational Facility"),
                "priority": gt.get("psif_priority", "LOW")
            })

    return incidents


@router.get("/precursors", response_model=List[PrecursorClusterSchema])
def get_systemic_precursor_clusters(db: Session = Depends(get_db)):
    """
    Returns discovered systemic precursor clusters, common barrier failure modes,
    and cross-asset recurring SIF exposure patterns.
    """
    incidents = _gather_incidents(db)
    clusters = precursor_cluster_service.cluster_incidents(incidents)

    results = []
    for c in clusters:
        results.append(PrecursorClusterSchema(
            cluster_id=c["cluster_id"],
            theme=c["theme"],
            primary_iogp_rule=c["primary_iogp_rule"],
            exposure_fingerprint=c["exposure_fingerprint"],
            common_failure=c["common_failure"],
            hazard=c["hazard"],
            reports_count=c["reports_count"],
            high_psif_count=c["high_psif_count"],
            recurrence_score=c["recurrence_score"],
            affected_facilities=c["affected_facilities"],
            facility_count=c["facility_count"],
            barrier_breakdowns=c["barrier_breakdowns"],
            sample_incidents=c["sample_incidents"]
        ))
    return results


@router.get("/graph", response_model=ClusterGraphResponse)
def get_precursor_network_graph(db: Session = Depends(get_db)):
    """
    Returns node-link graph data (nodes and links) mapping clusters, assets,
    failed barriers, and incidents for interactive network visualization.
    """
    incidents = _gather_incidents(db)
    graph_data = precursor_cluster_service.generate_cluster_graph(incidents)

    nodes = [
        ClusterGraphNodeSchema(
            id=n["id"],
            label=n["label"],
            type=n["type"],
            category=n["category"],
            val=n["val"],
            priority=n["priority"],
            fingerprint=n.get("fingerprint", "")
        )
        for n in graph_data["nodes"]
    ]

    links = [
        ClusterGraphLinkSchema(
            source=link["source"],
            target=link["target"],
            relation=link["relation"],
            weight=link["weight"],
        )
        for link in graph_data["links"]
    ]

    return ClusterGraphResponse(
        nodes=nodes,
        links=links,
        total_nodes=graph_data["total_nodes"],
        total_links=graph_data["total_links"],
        cluster_count=graph_data["cluster_count"]
    )
