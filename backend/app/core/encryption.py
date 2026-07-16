"""
Encryption utility for storing sensitive values in the database.

Uses Fernet symmetric encryption. When ENCRYPTION_KEY is configured it is the
primary key; the SECRET_KEY-derived key is always kept as a secondary decryption
key so values encrypted before ENCRYPTION_KEY existed still decrypt. This lets
SECRET_KEY be rotated without losing access to stored ciphertext.
"""
import base64
import hashlib
import logging

from cryptography.fernet import Fernet, InvalidToken, MultiFernet

from app.core.config import settings

logger = logging.getLogger(__name__)


def _derive_fernet(secret: str) -> Fernet:
    """Derive a Fernet instance from an arbitrary secret string via SHA-256."""
    raw = hashlib.sha256(secret.encode()).digest()
    return Fernet(base64.urlsafe_b64encode(raw))


# Primary key first (used for new encryptions); SECRET_KEY-derived key last so
# legacy ciphertext still decrypts. MultiFernet encrypts with keys[0] and
# decrypts by trying each key in order.
_keys = []
if settings.ENCRYPTION_KEY:
    _keys.append(_derive_fernet(settings.ENCRYPTION_KEY))
_keys.append(_derive_fernet(settings.SECRET_KEY))
_fernet = MultiFernet(_keys)


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
