"""
API Endpoints for Generative AI & Grounded RAG Safety Assistant (Phase 21 & 22).
"""

from typing import List, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from ml.rag.safety_corpus import APPROVED_SAFETY_CHUNKS
from ml.rag.safety_rag import InvestigationBriefResponse, SafetyQAResponse, safety_rag_engine

router = APIRouter()


class SynthesizeInvestigationRequest(BaseModel):
    narrative: str = Field(description="Incident description / precursor text")
    installation: Optional[str] = Field(default="Duliajan Gas Processing Station", description="Operational asset")
    psif_priority: Optional[str] = Field(default="HIGH", description="HIGH, REVIEW, LOW")
    primary_rules: Optional[List[str]] = Field(default_factory=list, description="Associated IOGP Life-Saving Rules")
    failed_controls: Optional[List[str]] = Field(default_factory=list, description="Extracted failed controls")
    report_id: Optional[str] = Field(default=None, description="Optional associated report identifier")


class SafetyQARequest(BaseModel):
    query: str = Field(description="Operational safety question (e.g. gas testing limits for confined space)")


class RegisteredStandardSummary(BaseModel):
    standard: str
    title: str
    section: str
    category: str
    citations: str


@router.post("/synthesize-investigation", response_model=InvestigationBriefResponse)
def synthesize_investigation_brief(payload: SynthesizeInvestigationRequest):
    """
    Generates an executive safety investigation brief grounded in approved standards (Phase 21).
    Synthesizes executive summary, barrier breakdown, and verified remedial citations.
    """
    if not payload.narrative or len(payload.narrative.strip()) < 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incident narrative is required to synthesize investigation brief."
        )

    brief = safety_rag_engine.synthesize_investigation_brief(
        narrative=payload.narrative,
        installation=payload.installation or "Duliajan Gas Processing Station",
        psif_priority=payload.psif_priority or "HIGH",
        primary_rules=payload.primary_rules,
        failed_controls=payload.failed_controls
    )

    return brief


@router.post("/safety-qa", response_model=SafetyQAResponse)
def ask_safety_standards(payload: SafetyQARequest):
    """
    Answers operational safety queries with verbatim citations from approved standards (Phase 21).
    Equipped with prompt-injection defense (Phase 22).
    """
    if not payload.query or len(payload.query.strip()) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Safety query must not be empty."
        )

    return safety_rag_engine.answer_safety_query(payload.query)


@router.get("/standards", response_model=List[RegisteredStandardSummary])
def list_approved_standards():
    """
    Lists all registered approved Indian & International safety standards in the RAG corpus.
    """
    return [
        RegisteredStandardSummary(
            standard=chunk["standard"],
            title=chunk["title"],
            section=chunk["section"],
            category=chunk["category"],
            citations=chunk["citations"]
        )
        for chunk in APPROVED_SAFETY_CHUNKS
    ]
