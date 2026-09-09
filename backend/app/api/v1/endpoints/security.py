"""
OIL-SIF Guardian — Security & RBAC Governance Endpoints
Provides security audit checks, RBAC verification, and statutory compliance status.
"""

from typing import Any, Dict

from fastapi import APIRouter, Depends

from backend.app.core.security import AuthUser, UserRole, get_current_user, get_security_audit_summary

router = APIRouter()


@router.get("/audit", summary="Statutory platform security audit report")
def get_security_audit() -> Dict[str, Any]:
    """
    Returns platform security audit posture including PII masking status,
    RBAC hierarchy, cryptographic integrity, and transport security controls.
    """
    return get_security_audit_summary()


@router.get("/roles", summary="Active RBAC role matrix")
def get_rbac_roles() -> Dict[str, Any]:
    """
    Returns supported enterprise user roles and permission matrix.
    """
    return {
        "roles": [r.value for r in UserRole],
        "hierarchy_levels": {
            "FIELD_REPORTER": "Tier 1: Read-only triage view, submit reports",
            "HSE_REVIEWER": "Tier 2: Adjudicate standard reports, review queue",
            "HSE_LEAD": "Tier 3: Issue corrective actions, audit overrides",
            "SAFETY_MANAGER": "Tier 4: Enterprise analytics, asset-level oversight",
            "CHIEF_SAFETY_OFFICER": "Tier 5: Rule 2 veto override, statutory dossiers",
            "SYSTEM_ADMIN": "Tier 6: Full platform & model governance"
        },
        "guarantee": "Zero False Negatives Invariant (Rule 2 Veto cannot be bypassed by standard roles)"
    }


@router.get("/me", summary="Current authenticated user context")
def get_caller_identity(user: AuthUser = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Returns current authenticated user identity and effective permission tier.
    """
    return {
        "user_id": user.user_id,
        "role": user.role.value,
        "is_executive": user.has_role(UserRole.CHIEF_SAFETY_OFFICER, UserRole.SAFETY_MANAGER),
        "can_override_veto": user.has_role(UserRole.CHIEF_SAFETY_OFFICER, UserRole.HSE_LEAD),
        "can_issue_capa": user.has_role(UserRole.HSE_LEAD, UserRole.SAFETY_MANAGER, UserRole.CHIEF_SAFETY_OFFICER)
    }
