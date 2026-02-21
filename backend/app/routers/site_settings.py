"""Public site settings routes."""
from typing import Any, Dict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services import site_settings_service

router = APIRouter(tags=["Settings"])


@router.get(
    "/settings/public",
    summary="Get public site settings",
)
def get_public_settings(
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Get whitelisted public settings. No authentication required."""
    return site_settings_service.get_public_settings(db)
