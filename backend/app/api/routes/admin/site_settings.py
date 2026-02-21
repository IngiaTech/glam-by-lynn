"""Admin site settings management routes."""
from typing import Any, Dict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_admin_user
from app.models.user import User
from app.services import site_settings_service

router = APIRouter(tags=["Admin Settings"])


@router.get(
    "/admin/settings",
    summary="Get all site settings (admin only)",
)
def get_all_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Dict[str, Any]:
    """Get all site settings as a key-value dictionary."""
    return site_settings_service.get_all_settings(db)


@router.put(
    "/admin/settings",
    summary="Update site settings (admin only)",
)
def update_settings(
    settings: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Dict[str, Any]:
    """Bulk create or update site settings."""
    return site_settings_service.upsert_settings(db, settings)
