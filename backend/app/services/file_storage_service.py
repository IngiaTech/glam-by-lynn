"""
File storage service — thin proxy that delegates to the active storage provider.

The global `file_storage` instance is imported by product_image_service and
other modules.  Its public interface (upload_file / delete_file) is unchanged.
"""
import logging
import mimetypes
import uuid
from pathlib import Path
from typing import BinaryIO, Optional

from app.services.storage.local_provider import LocalStorageProvider

logger = logging.getLogger(__name__)


class FileStorageService:
    """Proxy that resolves the active provider on every operation."""

    def _get_provider(self):
        """Return the currently configured StorageProvider, falling back to local."""
        try:
            from app.services.storage.factory import get_storage_provider
            return get_storage_provider()
        except Exception as e:
            logger.warning(f"Could not resolve storage provider, using local: {e}")
            return LocalStorageProvider()

    # ------------------------------------------------------------------
    # Public API (unchanged signature)
    # ------------------------------------------------------------------

    def upload_file(
        self,
        file: BinaryIO,
        filename: str,
        folder: str = "products",
        content_type: Optional[str] = None,
    ) -> str:
        file_extension = Path(filename).suffix
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_key = f"{folder}/{unique_filename}"

        if not content_type:
            content_type, _ = mimetypes.guess_type(filename)
            if not content_type:
                content_type = "application/octet-stream"

        file_data = file.read()
        provider = self._get_provider()

        try:
            return provider.upload(file_data, file_key, content_type)
        except Exception as e:
            logger.warning(f"Upload via {type(provider).__name__} failed, falling back to local: {e}")
            return LocalStorageProvider().upload(file_data, file_key, content_type)

    def delete_file(self, file_url: str) -> bool:
        """
        Delete a file.  Routes to the correct provider based on URL format
        rather than the currently active provider — so old S3/Cloudinary files
        can still be deleted after switching back to local.
        """
        if not file_url:
            return False

        try:
            if "res.cloudinary.com" in file_url:
                from app.services.storage.cloudinary_provider import CloudinaryStorageProvider
                # Need Cloudinary credentials from config to delete
                provider = self._get_provider()
                if isinstance(provider, CloudinaryStorageProvider):
                    return provider.delete(file_url)
                # Can't delete Cloudinary files without credentials
                logger.warning("Cannot delete Cloudinary file — Cloudinary is not the active provider")
                return False

            if file_url.startswith("https://") and ".s3." in file_url:
                from app.services.storage.s3_provider import S3StorageProvider
                provider = self._get_provider()
                if isinstance(provider, S3StorageProvider):
                    return provider.delete(file_url)
                logger.warning("Cannot delete S3 file — S3 is not the active provider")
                return False

            # Local file
            return LocalStorageProvider().delete(file_url)

        except Exception as e:
            logger.warning(f"delete_file failed for {file_url}: {e}")
            return False


# Global instance — consumed by product_image_service and others
file_storage = FileStorageService()
