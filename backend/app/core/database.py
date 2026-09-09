"""
Database Connection and Session Management via SQLAlchemy.
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

from backend.app.core.config import settings

# Engine configuration with thread check disabled for SQLite
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency yielding a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initializes tables in database and applies automatic schema updates."""
    Base.metadata.create_all(bind=engine)
    if settings.DATABASE_URL.startswith("sqlite"):
        with engine.connect() as conn:
            try:
                # Reports table migrations
                result = conn.execute(text("PRAGMA table_info(reports)"))
                columns = [row[1] for row in result.fetchall()]
                if "quality_score" not in columns:
                    conn.execute(text("ALTER TABLE reports ADD COLUMN quality_score FLOAT"))
                if "quality_grade" not in columns:
                    conn.execute(text("ALTER TABLE reports ADD COLUMN quality_grade VARCHAR(8)"))

                # Reviews table migrations
                rev_res = conn.execute(text("PRAGMA table_info(reviews)"))
                rev_cols = [row[1] for row in rev_res.fetchall()]
                if "reviewer_role" not in rev_cols:
                    conn.execute(text("ALTER TABLE reviews ADD COLUMN reviewer_role VARCHAR(64)"))
                if "decision" not in rev_cols:
                    conn.execute(text("ALTER TABLE reviews ADD COLUMN decision VARCHAR(32)"))
                if "final_primary_rule" not in rev_cols:
                    conn.execute(text("ALTER TABLE reviews ADD COLUMN final_primary_rule VARCHAR(64)"))
                if "final_secondary_rules" not in rev_cols:
                    conn.execute(text("ALTER TABLE reviews ADD COLUMN final_secondary_rules TEXT"))
                if "barrier_failures" not in rev_cols:
                    conn.execute(text("ALTER TABLE reviews ADD COLUMN barrier_failures TEXT"))
                if "statutory_tags" not in rev_cols:
                    conn.execute(text("ALTER TABLE reviews ADD COLUMN statutory_tags TEXT"))
                if "override_reason_code" not in rev_cols:
                    conn.execute(text("ALTER TABLE reviews ADD COLUMN override_reason_code VARCHAR(64)"))
                if "veto_override_approved" not in rev_cols:
                    conn.execute(text("ALTER TABLE reviews ADD COLUMN veto_override_approved BOOLEAN DEFAULT 0"))
                if "senior_signoff_by" not in rev_cols:
                    conn.execute(text("ALTER TABLE reviews ADD COLUMN senior_signoff_by VARCHAR(64)"))
                if "recalibration_flag" not in rev_cols:
                    conn.execute(text("ALTER TABLE reviews ADD COLUMN recalibration_flag BOOLEAN DEFAULT 0"))

                # Corrective actions table migrations
                act_res = conn.execute(text("PRAGMA table_info(corrective_actions)"))
                act_cols = [row[1] for row in act_res.fetchall()]
                if "verified_by" not in act_cols:
                    conn.execute(text("ALTER TABLE corrective_actions ADD COLUMN verified_by VARCHAR(128)"))
                if "verified_at" not in act_cols:
                    conn.execute(text("ALTER TABLE corrective_actions ADD COLUMN verified_at DATETIME"))
                if "verification_notes" not in act_cols:
                    conn.execute(text("ALTER TABLE corrective_actions ADD COLUMN verification_notes TEXT"))
                if "effectiveness_rating" not in act_cols:
                    conn.execute(text("ALTER TABLE corrective_actions ADD COLUMN effectiveness_rating VARCHAR(32) DEFAULT 'EFFECTIVE'"))

                conn.commit()
            except Exception:
                pass

