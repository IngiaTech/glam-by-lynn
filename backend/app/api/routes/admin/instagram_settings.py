"""Admin routes for Instagram integration settings."""
import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_super_admin
from app.core.encryption import encrypt_value
from app.models.user import User
from app.schemas.instagram_settings import (
    InstagramSettingsUpdate,
    InstagramSettingsResponse,
    InstagramSyncResponse,
)
from app.services import site_settings_service
from app.services.instagram_service import sync_instagram_posts

logger = logging.getLogger(__name__)

MASKED = "********"

router = APIRouter(tags=["Admin Instagram Settings"])


@router.get(
    "/admin/settings/instagram",
    response_model=InstagramSettingsResponse,
    summary="Get Instagram integration settings (token masked)",
)
def get_instagram_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_super_admin),
) -> InstagramSettingsResponse:
    enabled_raw = site_settings_service.get_setting(db, "instagram_enabled")
    enabled = enabled_raw and enabled_raw.strip('"').lower() in ("true", "1")

    user_id_raw = site_settings_service.get_setting(db, "instagram_user_id")
    user_id = user_id_raw.strip('"') if user_id_raw else None

    token_raw = site_settings_service.get_setting(db, "instagram_access_token")
    access_token_set = bool(token_raw)

    last_sync_raw = site_settings_service.get_setting(db, "instagram_last_sync")
    last_sync = last_sync_raw.strip('"') if last_sync_raw else None

    expires_raw = site_settings_service.get_setting(db, "instagram_token_expires_at")
    token_expires_at = expires_raw.strip('"') if expires_raw else None

    return InstagramSettingsResponse(
        enabled=enabled,
        user_id=user_id,
        access_token_set=access_token_set,
        last_sync=last_sync,
        token_expires_at=token_expires_at,
    )


@router.put(
    "/admin/settings/instagram",
    response_model=InstagramSettingsResponse,
    summary="Save Instagram integration settings",
)
def update_instagram_settings(
    payload: InstagramSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_super_admin),
) -> InstagramSettingsResponse:
    site_settings_service.upsert_setting(db, "instagram_enabled", payload.enabled)

    if payload.user_id is not None:
        site_settings_service.upsert_setting(db, "instagram_user_id", payload.user_id)

    if payload.access_token and payload.access_token != MASKED:
        encrypted = encrypt_value(payload.access_token)
        site_settings_service.upsert_setting(db, "instagram_access_token", encrypted)

    logger.info(f"Instagram settings updated by user={current_user.id}")
    return get_instagram_settings(db=db, current_user=current_user)


@router.post(
    "/admin/settings/instagram/sync",
    response_model=InstagramSyncResponse,
    summary="Trigger manual Instagram sync",
)
def trigger_instagram_sync(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_super_admin),
) -> InstagramSyncResponse:
    result = sync_instagram_posts(db)
    return InstagramSyncResponse(
        synced=result["synced"],
        deleted=result["deleted"],
        message=f"Sync complete: {result['synced']} posts synced, {result['deleted']} removed.",
    )
