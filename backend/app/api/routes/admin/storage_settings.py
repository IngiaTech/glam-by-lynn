"""Admin routes for image storage settings management."""
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_super_admin
from app.core.encryption import encrypt_value, decrypt_value
from app.models.user import User
from app.schemas.storage_settings import (
    StorageSettingsUpdate,
    StorageSettingsResponse,
    S3ConfigResponse,
    CloudinaryConfigResponse,
    TestConnectionRequest,
    TestConnectionResponse,
)
from app.services import site_settings_service
from app.services.storage.factory import invalidate_cache

logger = logging.getLogger(__name__)

MASKED = "********"

router = APIRouter(tags=["Admin Storage Settings"])


@router.get(
    "/admin/settings/storage",
    response_model=StorageSettingsResponse,
    summary="Get current storage configuration (secrets masked)",
)
def get_storage_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_super_admin),
) -> StorageSettingsResponse:
    provider = site_settings_service.get_setting(db, "storage_provider") or "local"
    # Strip JSON quotes if present
    provider = provider.strip('"')

    s3_config = None
    if site_settings_service.get_setting(db, "storage_s3_bucket_name"):
        bucket = site_settings_service.get_setting(db, "storage_s3_bucket_name") or ""
        access_key = site_settings_service.get_setting(db, "storage_s3_access_key_id") or ""
        region = site_settings_service.get_setting(db, "storage_s3_region") or "us-east-1"
        s3_config = S3ConfigResponse(
            bucket_name=bucket.strip('"'),
            access_key_id=access_key.strip('"'),
            secret_access_key=MASKED,
            region=region.strip('"'),
        )

    cloudinary_config = None
    if site_settings_service.get_setting(db, "storage_cloudinary_cloud_name"):
        cloud_name = site_settings_service.get_setting(db, "storage_cloudinary_cloud_name") or ""
        api_key = site_settings_service.get_setting(db, "storage_cloudinary_api_key") or ""
        cloudinary_config = CloudinaryConfigResponse(
            cloud_name=cloud_name.strip('"'),
            api_key=api_key.strip('"'),
            api_secret=MASKED,
        )

    return StorageSettingsResponse(
        provider=provider,
        s3=s3_config,
        cloudinary=cloudinary_config,
    )


@router.put(
    "/admin/settings/storage",
    response_model=StorageSettingsResponse,
    summary="Save storage configuration",
)
def update_storage_settings(
    payload: StorageSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_super_admin),
) -> StorageSettingsResponse:
    # Validate required config for the selected provider
    if payload.provider == "s3" and not payload.s3:
        raise HTTPException(status_code=422, detail="S3 configuration is required when provider is 's3'")
    if payload.provider == "cloudinary" and not payload.cloudinary:
        raise HTTPException(status_code=422, detail="Cloudinary configuration is required when provider is 'cloudinary'")

    site_settings_service.upsert_setting(db, "storage_provider", payload.provider)

    if payload.s3:
        site_settings_service.upsert_setting(db, "storage_s3_bucket_name", payload.s3.bucket_name)
        site_settings_service.upsert_setting(db, "storage_s3_access_key_id", payload.s3.access_key_id)
        site_settings_service.upsert_setting(db, "storage_s3_region", payload.s3.region)
        # Only encrypt and save if the secret was actually changed
        if payload.s3.secret_access_key != MASKED:
            encrypted = encrypt_value(payload.s3.secret_access_key)
            site_settings_service.upsert_setting(db, "storage_s3_secret_access_key", encrypted)

    if payload.cloudinary:
        site_settings_service.upsert_setting(db, "storage_cloudinary_cloud_name", payload.cloudinary.cloud_name)
        site_settings_service.upsert_setting(db, "storage_cloudinary_api_key", payload.cloudinary.api_key)
        if payload.cloudinary.api_secret != MASKED:
            encrypted = encrypt_value(payload.cloudinary.api_secret)
            site_settings_service.upsert_setting(db, "storage_cloudinary_api_secret", encrypted)

    invalidate_cache()
    logger.info(f"Storage settings updated to provider={payload.provider} by user={current_user.id}")

    return get_storage_settings(db=db, current_user=current_user)


@router.post(
    "/admin/settings/storage/test",
    response_model=TestConnectionResponse,
    summary="Test storage connection with provided credentials",
)
def test_storage_connection(
    payload: TestConnectionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_super_admin),
) -> TestConnectionResponse:
    if payload.provider == "local":
        from app.services.storage.local_provider import LocalStorageProvider
        result = LocalStorageProvider().test_connection()
        return TestConnectionResponse(**result)

    if payload.provider == "s3":
        if not payload.s3:
            raise HTTPException(status_code=422, detail="S3 configuration is required")
        try:
            # If secret is masked, read the stored encrypted secret
            secret = payload.s3.secret_access_key
            if secret == MASKED:
                stored = site_settings_service.get_setting(db, "storage_s3_secret_access_key")
                if stored:
                    secret = decrypt_value(stored.strip('"'))
                else:
                    return TestConnectionResponse(success=False, message="No stored S3 secret found. Please enter your secret key.")

            from app.services.storage.s3_provider import S3StorageProvider
            provider = S3StorageProvider(
                bucket_name=payload.s3.bucket_name,
                access_key_id=payload.s3.access_key_id,
                secret_access_key=secret,
                region=payload.s3.region,
            )
            result = provider.test_connection()
            return TestConnectionResponse(**result)
        except Exception as e:
            return TestConnectionResponse(success=False, message=str(e))

    if payload.provider == "cloudinary":
        if not payload.cloudinary:
            raise HTTPException(status_code=422, detail="Cloudinary configuration is required")
        try:
            api_secret = payload.cloudinary.api_secret
            if api_secret == MASKED:
                stored = site_settings_service.get_setting(db, "storage_cloudinary_api_secret")
                if stored:
                    api_secret = decrypt_value(stored.strip('"'))
                else:
                    return TestConnectionResponse(success=False, message="No stored Cloudinary secret found. Please enter your API secret.")

            from app.services.storage.cloudinary_provider import CloudinaryStorageProvider
            provider = CloudinaryStorageProvider(
                cloud_name=payload.cloudinary.cloud_name,
                api_key=payload.cloudinary.api_key,
                api_secret=api_secret,
            )
            result = provider.test_connection()
            return TestConnectionResponse(**result)
        except Exception as e:
            return TestConnectionResponse(success=False, message=str(e))

    return TestConnectionResponse(success=False, message=f"Unknown provider: {payload.provider}")
