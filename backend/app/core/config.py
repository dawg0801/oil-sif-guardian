"""
Application Configuration and Settings via Pydantic.
"""

from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "OIL-SIF Guardian"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Server
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "*"
    ]

    # Database: Defaults to SQLite for local development
    DATABASE_URL: str = "sqlite:///./oil_sif_guardian.db"

    # Model & Triage Thresholds
    MODEL_VERSION: str = "psif-v1.0"
    PSIF_HIGH_THRESHOLD: float = 0.70
    PSIF_REVIEW_THRESHOLD: float = 0.40

    # Auditing
    ENABLE_AUDIT_LOG: bool = True

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
