"""
Schema Contract Validation Tests.
"""

import pytest
from pydantic import ValidationError

from backend.app.schemas.action import CorrectiveActionCreate
from backend.app.schemas.report import ReportCreate
from backend.app.schemas.review import ReviewCreate


def test_valid_report_create_schema():
    report = ReportCreate(
        site="Moran Station",
        narrative="Worker tripped over pipeline marker on access path, sustained minor foot sprain."
    )
    assert report.site == "Moran Station"
    assert report.report_type == "near_miss"


def test_invalid_short_narrative():
    with pytest.raises(ValidationError):
        ReportCreate(
            site="Moran Station",
            narrative="Too short"  # min length is 10
        )


def test_review_create_schema():
    review = ReviewCreate(
        reviewer_id="HSE-001",
        status="CONFIRMED",
        final_psif_label="HIGH"
    )
    assert review.reviewer_id == "HSE-001"
    assert review.status == "CONFIRMED"


def test_corrective_action_schema():
    action = CorrectiveActionCreate(
        title="Replace pipeline warning tape",
        assigned_to="Civil Maintenance Supervisor"
    )
    assert action.status == "OPEN"
    assert action.assigned_to == "Civil Maintenance Supervisor"
