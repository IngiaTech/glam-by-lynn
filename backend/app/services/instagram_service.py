"""Instagram Graph API integration service for syncing posts to the gallery."""
import logging
import threading
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import httpx
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.encryption import decrypt_value
from app.models.content import GalleryPost
from app.services import site_settings_service

logger = logging.getLogger(__name__)

GRAPH_API_BASE = "https://graph.instagram.com"
MEDIA_FIELDS = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp"
SYNC_TTL_SECONDS = 3600  # 1 hour
TOKEN_REFRESH_DAYS_BEFORE_EXPIRY = 7

_sync_lock = threading.Lock()
_sync_in_progress = False


def get_instagram_config(db: Session) -> Optional[Dict[str, Any]]:
    """Read Instagram configuration from site_settings.

    Returns None if not configured or disabled.
    """
    enabled_raw = site_settings_service.get_setting(db, "instagram_enabled")
    if not enabled_raw:
        return None

    # get_setting returns raw stored value; upsert_setting JSON-encodes,
    # so a boolean true is stored as '"true"' (JSON string) or 'true'.
    enabled_str = enabled_raw.strip('"').lower()
    if enabled_str not in ("true", "1"):
        return None

    user_id_raw = site_settings_service.get_setting(db, "instagram_user_id")
    token_raw = site_settings_service.get_setting(db, "instagram_access_token")

    if not user_id_raw or not token_raw:
        return None

    user_id = user_id_raw.strip('"')
    try:
        access_token = decrypt_value(token_raw.strip('"'))
    except (ValueError, Exception):
        logger.error("Failed to decrypt Instagram access token")
        return None

    expires_raw = site_settings_service.get_setting(db, "instagram_token_expires_at")
    token_expires_at = expires_raw.strip('"') if expires_raw else None

    return {
        "access_token": access_token,
        "user_id": user_id,
        "token_expires_at": token_expires_at,
    }


def fetch_instagram_media(access_token: str, user_id: str) -> List[Dict[str, Any]]:
    """Fetch media from the Instagram Graph API.

    Paginates through results up to 100 posts max.
    """
    url = f"{GRAPH_API_BASE}/{user_id}/media"
    params = {
        "fields": MEDIA_FIELDS,
        "limit": 50,
        "access_token": access_token,
    }

    all_media: List[Dict[str, Any]] = []

    with httpx.Client(timeout=30) as client:
        while url and len(all_media) < 100:
            response = client.get(url, params=params)
            response.raise_for_status()
            data = response.json()

            all_media.extend(data.get("data", []))

            # Follow pagination
            next_url = data.get("paging", {}).get("next")
            if next_url:
                url = next_url
                params = {}  # next URL already contains params
            else:
                break

    return all_media[:100]


def _map_media_type(ig_media_type: str) -> str:
    """Map Instagram media_type to gallery model media_type."""
    if ig_media_type == "VIDEO":
        return "video"
    # IMAGE, CAROUSEL_ALBUM -> image
    return "image"


def sync_instagram_posts(db: Session) -> Dict[str, Any]:
    """Fetch Instagram media and upsert into gallery_posts.

    Returns dict with synced and deleted counts.
    """
    config = get_instagram_config(db)
    if not config:
        return {"synced": 0, "deleted": 0}

    # Check if token needs refresh
    _maybe_refresh_token(db, config)

    try:
        media_items = fetch_instagram_media(config["access_token"], config["user_id"])
    except httpx.HTTPStatusError as e:
        logger.error(f"Instagram API error: {e.response.status_code} - {e.response.text}")
        return {"synced": 0, "deleted": 0}
    except Exception as e:
        logger.error(f"Failed to fetch Instagram media: {e}")
        return {"synced": 0, "deleted": 0}

    fetched_external_ids = set()
    synced_count = 0

    for item in media_items:
        external_id = item["id"]
        fetched_external_ids.add(external_id)

        existing = db.query(GalleryPost).filter(
            GalleryPost.external_id == external_id
        ).first()

        media_url = item.get("media_url", "")
        thumbnail_url = item.get("thumbnail_url")
        caption = item.get("caption", "")
        permalink = item.get("permalink", "")
        ig_media_type = item.get("media_type", "IMAGE")
        timestamp_str = item.get("timestamp")

        published_at = datetime.now(timezone.utc)
        if timestamp_str:
            try:
                published_at = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
            except (ValueError, AttributeError):
                pass

        mapped_type = _map_media_type(ig_media_type)

        # For carousel albums, use media_url (first image) as thumbnail too
        if ig_media_type == "CAROUSEL_ALBUM" and not thumbnail_url:
            thumbnail_url = media_url

        if existing:
            existing.media_url = media_url
            existing.thumbnail_url = thumbnail_url
            existing.caption = caption
            existing.external_permalink = permalink
            existing.media_type = mapped_type
            existing.published_at = published_at
            existing.updated_at = datetime.utcnow()
        else:
            new_post = GalleryPost(
                media_type=mapped_type,
                media_url=media_url,
                thumbnail_url=thumbnail_url,
                caption=caption,
                source_type="instagram",
                external_id=external_id,
                external_permalink=permalink,
                published_at=published_at,
            )
            db.add(new_post)

        synced_count += 1

    # Remove Instagram posts that no longer exist on Instagram
    deleted_count = 0
    if fetched_external_ids:
        stale_posts = db.query(GalleryPost).filter(
            GalleryPost.source_type == "instagram",
            GalleryPost.external_id.isnot(None),
            GalleryPost.external_id.notin_(fetched_external_ids),
        ).all()
        deleted_count = len(stale_posts)
        for post in stale_posts:
            db.delete(post)

    db.commit()

    # Update last sync timestamp
    site_settings_service.upsert_setting(
        db, "instagram_last_sync", datetime.now(timezone.utc).isoformat()
    )

    logger.info(f"Instagram sync complete: synced={synced_count}, deleted={deleted_count}")
    return {"synced": synced_count, "deleted": deleted_count}


def _maybe_refresh_token(db: Session, config: Dict[str, Any]) -> None:
    """Refresh the long-lived token if it's close to expiring."""
    expires_at_str = config.get("token_expires_at")
    if not expires_at_str:
        return

    try:
        expires_at = datetime.fromisoformat(expires_at_str.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return

    now = datetime.now(timezone.utc)
    if expires_at - now > timedelta(days=TOKEN_REFRESH_DAYS_BEFORE_EXPIRY):
        return

    try:
        new_token = refresh_long_lived_token(config["access_token"])
        from app.core.encryption import encrypt_value
        encrypted = encrypt_value(new_token)
        site_settings_service.upsert_setting(db, "instagram_access_token", encrypted)
        # New token is valid for 60 days
        new_expiry = now + timedelta(days=60)
        site_settings_service.upsert_setting(
            db, "instagram_token_expires_at", new_expiry.isoformat()
        )
        config["access_token"] = new_token
        logger.info("Instagram access token refreshed successfully")
    except Exception as e:
        logger.warning(f"Failed to refresh Instagram token: {e}")


def refresh_long_lived_token(access_token: str) -> str:
    """Refresh a long-lived Instagram token (valid for 60 days).

    Raises on failure.
    """
    url = f"{GRAPH_API_BASE}/refresh_access_token"
    params = {
        "grant_type": "ig_refresh_token",
        "access_token": access_token,
    }

    with httpx.Client(timeout=15) as client:
        response = client.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        return data["access_token"]


def maybe_trigger_sync(db: Session) -> None:
    """Trigger a background sync if the last sync is stale (>1 hour).

    Non-blocking: spawns a daemon thread if sync is needed.
    Thread-safe via _sync_lock.
    """
    global _sync_in_progress

    config = get_instagram_config(db)
    if not config:
        return

    last_sync_raw = site_settings_service.get_setting(db, "instagram_last_sync")
    if last_sync_raw:
        last_sync_str = last_sync_raw.strip('"')
        try:
            last_sync = datetime.fromisoformat(last_sync_str.replace("Z", "+00:00"))
            elapsed = (datetime.now(timezone.utc) - last_sync).total_seconds()
            if elapsed < SYNC_TTL_SECONDS:
                return
        except (ValueError, AttributeError):
            pass  # Invalid timestamp, trigger sync

    if not _sync_lock.acquire(blocking=False):
        return  # Another sync check is in progress

    try:
        if _sync_in_progress:
            return

        _sync_in_progress = True
        thread = threading.Thread(target=_background_sync, daemon=True)
        thread.start()
    finally:
        _sync_lock.release()


def _background_sync() -> None:
    """Run sync in a background thread with its own DB session."""
    global _sync_in_progress
    try:
        db = SessionLocal()
        try:
            sync_instagram_posts(db)
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Background Instagram sync failed: {e}")
    finally:
        _sync_in_progress = False
