"""
OIL-SIF Guardian — FastAPI Application Main Entrypoint.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.v1.api import api_router
from backend.app.core.config import settings
from backend.app.core.database import init_db

# Ensure tables exist immediately
init_db()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description=(
        "OIL-SIF Guardian: Explainable, human-in-the-loop SIF precursor intelligence platform "
        "for Oil India Limited (OIL). Prioritizes high-risk HSSE incident narratives, maps "
        "IOGP Life-Saving Rules, and provides verifiable evidence highlights."
    ),
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_security_headers(request, call_next):
    """
    Phase 17 Enterprise Security: Injects statutory security headers on all HTTP responses.
    """
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


# Include API v1 routes
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    return {
        "message": "Welcome to OIL-SIF Guardian API",
        "docs": "/docs",
        "health": f"{settings.API_V1_STR}/health",
        "version": settings.VERSION
    }
