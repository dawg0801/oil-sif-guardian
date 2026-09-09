"""
Main API Router binding all v1 endpoints.
"""

from fastapi import APIRouter

from backend.app.api.v1.endpoints import (
    actions,
    active_learning,
    analytics,
    annotation,
    baseline,
    clusters,
    decision,
    extraction,
    health,
    iogp,
    models,
    ontology,
    rag,
    reports,
    reviews,
    rules,
    security,
)

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(reviews.router, prefix="/reviews", tags=["HSE Reviews & Adjudication"])
api_router.include_router(reviews.router, prefix="/reports", tags=["Reviews (Legacy)"])
api_router.include_router(actions.router, prefix="/actions", tags=["Corrective Actions Hub"])
api_router.include_router(actions.router, prefix="/reports", tags=["Corrective Actions"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(annotation.router, prefix="/annotation", tags=["Annotation & Benchmark"])
api_router.include_router(active_learning.router, prefix="/active-learning", tags=["Active Learning Prioritization"])
api_router.include_router(active_learning.router, prefix="/annotation/active-learning", tags=["Active Learning (Annotation)"])
api_router.include_router(rag.router, prefix="/rag", tags=["Generative AI & Grounded RAG Assistant"])
api_router.include_router(ontology.router, prefix="/ontology", tags=["Ontology & Barriers"])
api_router.include_router(clusters.router, prefix="/clusters", tags=["Precursor Clusters & Graph"])
api_router.include_router(baseline.router, prefix="/baseline", tags=["Baseline ML Modeling"])
api_router.include_router(extraction.router, prefix="/extraction", tags=["Safety NER & Information Extraction"])
api_router.include_router(models.router, prefix="/models", tags=["Contextual Models & Studio"])
api_router.include_router(iogp.router, prefix="/iogp", tags=["IOGP Life-Saving Rules"])
api_router.include_router(rules.router, prefix="/rules", tags=["Deterministic Safety Rules"])
api_router.include_router(decision.router, prefix="/decision", tags=["Hybrid Decision Engine"])
api_router.include_router(security.router, prefix="/security", tags=["Security & RBAC Governance"])

