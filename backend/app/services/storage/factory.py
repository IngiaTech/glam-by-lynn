"""
Storage provider factory with caching.
Reads configuration from site_settings and returns the appropriate provider.
"""
import hashlib
import json
import logging
from typing import Optional

from app.services.storage.base import StorageProvider
from app.services.storage.local_provider import LocalStorageProvider

logger = logging.getLogger(__name__)

# Module-level cache
_cached_provider: Optional[StorageProvider] = None
_cached_fingerprint: Optional[str] = None


def _read_storage_settings() -> dict:
    """Read storage-related keys from site_settings using a short-lived session."""
    from app.core.database import SessionLocal
    from app.models.site_setting import SiteSetting

    settings = {}
    db = SessionLocal()
    try:
        rows = db.query(SiteSetting).filter(
            SiteSetting.key.like("storage_%")
        ).all()
        for row in rows:
            try:
                settings[row.key] = json.loads(row.value)
            except (json.JSONDecodeError, TypeError):
                settings[row.key] = row.value
    finally:
        db.close()
    return settings


def _compute_fingerprint(config: dict) -> str:
    """Compute a hash of the config to detect changes."""
    raw = json.dumps(config, sort_keys=True)
    return hashlib.md5(raw.encode()).hexdigest()


def _build_provider(config: dict) -> StorageProvider:
    """Instantiate the provider specified by config, falling back to local."""
    provider_name = config.get("storage_provider", "local")

    if provider_name == "s3":
        try:
            from app.core.encryption import decrypt_value
            from app.services.storage.s3_provider import S3StorageProvider

            secret = config.get("storage_s3_secret_access_key", "")
            try:
                secret = decrypt_value(secret)
            except Exception:
                pass  # might already be plaintext during tests

            return S3StorageProvider(
                bucket_name=config.get("storage_s3_bucket_name", ""),
                access_key_id=config.get("storage_s3_access_key_id", ""),
                secret_access_key=secret,
                region=config.get("storage_s3_region", "us-east-1"),
            )
        except Exception as e:
            logger.warning(f"Failed to create S3 provider, falling back to local: {e}")
            return LocalStorageProvider()

    if provider_name == "cloudinary":
        try:
            from app.core.encryption import decrypt_value
            from app.services.storage.cloudinary_provider import CloudinaryStorageProvider

            api_secret = config.get("storage_cloudinary_api_secret", "")
            try:
                api_secret = decrypt_value(api_secret)
            except Exception:
                pass

            return CloudinaryStorageProvider(
                cloud_name=config.get("storage_cloudinary_cloud_name", ""),
                api_key=config.get("storage_cloudinary_api_key", ""),
                api_secret=api_secret,
            )
        except Exception as e:
            logger.warning(f"Failed to create Cloudinary provider, falling back to local: {e}")
            return LocalStorageProvider()

    return LocalStorageProvider()


def get_storage_provider() -> StorageProvider:
    """
    Return the currently configured storage provider.
    Uses a cached instance that is rebuilt only when the config fingerprint changes.
    """
    global _cached_provider, _cached_fingerprint

    try:
        config = _read_storage_settings()
    except Exception as e:
        logger.warning(f"Could not read storage settings, using local: {e}")
        if _cached_provider is not None:
            return _cached_provider
        return LocalStorageProvider()

    fingerprint = _compute_fingerprint(config)

    if _cached_provider is not None and _cached_fingerprint == fingerprint:
        return _cached_provider

    _cached_provider = _build_provider(config)
    _cached_fingerprint = fingerprint
    logger.info(f"Storage provider set to: {type(_cached_provider).__name__}")
    return _cached_provider


def invalidate_cache() -> None:
    """Force the next get_storage_provider() call to rebuild the provider."""
    global _cached_provider, _cached_fingerprint
    _cached_provider = None
    _cached_fingerprint = None
