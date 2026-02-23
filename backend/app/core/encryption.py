"""
Encryption utility for storing sensitive values in the database.
Uses Fernet symmetric encryption with a key derived from SECRET_KEY.
"""
import base64
import hashlib
import logging

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings

logger = logging.getLogger(__name__)

# Derive a Fernet key from SECRET_KEY using SHA-256
_raw = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
_fernet_key = base64.urlsafe_b64encode(_raw)
_fernet = Fernet(_fernet_key)


def encrypt_value(plaintext: str) -> str:
    """Encrypt a plaintext string and return a base64-encoded ciphertext."""
    return _fernet.encrypt(plaintext.encode()).decode()


def decrypt_value(ciphertext: str) -> str:
    """Decrypt a base64-encoded ciphertext and return the plaintext string."""
    try:
        return _fernet.decrypt(ciphertext.encode()).decode()
    except InvalidToken:
        logger.error("Failed to decrypt value - invalid token or corrupted data")
        raise ValueError("Failed to decrypt value")
