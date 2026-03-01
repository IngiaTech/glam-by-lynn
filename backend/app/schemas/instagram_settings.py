"""Instagram integration settings schemas."""
from typing import Optional

from pydantic import BaseModel


class InstagramSettingsUpdate(BaseModel):
    """Schema for updating Instagram integration settings."""

    enabled: bool
    access_token: Optional[str] = None  # Only sent when changing
    user_id: Optional[str] = None


class InstagramSettingsResponse(BaseModel):
    """Schema for Instagram integration settings response."""

    enabled: bool
    user_id: Optional[str] = None
    access_token_set: bool  # True if token exists (never expose actual token)
    last_sync: Optional[str] = None
    token_expires_at: Optional[str] = None


class InstagramSyncResponse(BaseModel):
    """Schema for Instagram sync operation response."""

    synced: int
    deleted: int
    message: str
