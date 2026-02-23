"""Local filesystem storage provider."""
import logging
import uuid
from pathlib import Path

from app.services.storage.base import StorageProvider

logger = logging.getLogger(__name__)


class LocalStorageProvider(StorageProvider):
    """Saves files to the local uploads/ directory."""

    def __init__(self):
        self.storage_path = Path("uploads")
        self.storage_path.mkdir(exist_ok=True)

    def upload(self, file_data: bytes, file_key: str, content_type: str) -> str:
        file_path = self.storage_path / file_key
        file_path.parent.mkdir(parents=True, exist_ok=True)
        with open(file_path, "wb") as f:
            f.write(file_data)
        return f"/uploads/{file_key}"

    def delete(self, file_url: str) -> bool:
        try:
            if file_url.startswith("/uploads/"):
                file_path = self.storage_path / file_url.replace("/uploads/", "")
            else:
                file_path = Path(file_url)
            if file_path.exists():
                file_path.unlink()
                return True
            return False
        except Exception:
            return False

    def test_connection(self) -> dict:
        try:
            test_file = self.storage_path / f".test_{uuid.uuid4().hex}"
            test_file.write_text("test")
            test_file.unlink()
            return {"success": True, "message": "Local storage directory is writable"}
        except Exception as e:
            return {"success": False, "message": f"Local storage error: {e}"}
