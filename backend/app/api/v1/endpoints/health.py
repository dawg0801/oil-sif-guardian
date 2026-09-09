"""
Health Check and System Readiness Endpoint.
"""

from datetime import datetime, timezone

from fastapi import APIRouter

from backend.app.core.config import settings

router = APIRouter()


@router.get("/health", tags=["Health"])
def get_health():
    """Returns service health status, version, and active model version."""
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "version": settings.VERSION,
        "model_version": settings.MODEL_VERSION,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
