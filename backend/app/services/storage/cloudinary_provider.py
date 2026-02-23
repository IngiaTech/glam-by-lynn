"""Cloudinary storage provider."""
import io
import logging
import os

from app.services.storage.base import StorageProvider

logger = logging.getLogger(__name__)


class CloudinaryStorageProvider(StorageProvider):
    """Uploads files to Cloudinary."""

    def __init__(self, cloud_name: str, api_key: str, api_secret: str):
        import cloudinary
        import cloudinary.uploader
        import cloudinary.api

        self._cloudinary = cloudinary
        self._uploader = cloudinary.uploader
        self._api = cloudinary.api

        cloudinary.config(
            cloud_name=cloud_name,
            api_key=api_key,
            api_secret=api_secret,
            secure=True,
        )

    def upload(self, file_data: bytes, file_key: str, content_type: str) -> str:
        # Strip extension from file_key to use as public_id
        public_id = os.path.splitext(file_key)[0]
        result = self._uploader.upload(
            io.BytesIO(file_data),
            public_id=public_id,
            resource_type="image",
            overwrite=True,
        )
        return result["secure_url"]

    def delete(self, file_url: str) -> bool:
        try:
            # Extract public_id from Cloudinary URL
            # Format: https://res.cloudinary.com/<cloud>/image/upload/v123/folder/file.ext
            if "res.cloudinary.com" in file_url:
                parts = file_url.split("/upload/")
                if len(parts) == 2:
                    # Remove version prefix (v123/) and extension
                    path = parts[1]
                    # Skip version number if present
                    if path.startswith("v") and "/" in path:
                        path = path.split("/", 1)[1]
                    public_id = os.path.splitext(path)[0]
                    self._uploader.destroy(public_id)
                    return True
            return False
        except Exception as e:
            logger.warning(f"Cloudinary delete failed: {e}")
            return False

    def test_connection(self) -> dict:
        try:
            self._api.ping()
            return {"success": True, "message": "Connected to Cloudinary"}
        except Exception as e:
            return {"success": False, "message": f"Cloudinary connection failed: {e}"}
