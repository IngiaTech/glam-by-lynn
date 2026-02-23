"""Abstract base class for storage providers."""
from abc import ABC, abstractmethod


class StorageProvider(ABC):
    """Interface that all storage providers must implement."""

    @abstractmethod
    def upload(self, file_data: bytes, file_key: str, content_type: str) -> str:
        """
        Upload file data and return the public URL.

        Args:
            file_data: Raw file bytes.
            file_key: Storage key (e.g. "products/<uuid>.jpg").
            content_type: MIME type of the file.

        Returns:
            Public URL string for the uploaded file.
        """

    @abstractmethod
    def delete(self, file_url: str) -> bool:
        """
        Delete a file by its URL.

        Args:
            file_url: The URL previously returned by upload().

        Returns:
            True if deleted successfully, False otherwise.
        """

    @abstractmethod
    def test_connection(self) -> dict:
        """
        Verify the provider is correctly configured.

        Returns:
            {"success": True/False, "message": str}
        """
