"""Site settings model for admin-controllable configuration."""
from datetime import datetime

from sqlalchemy import Column, DateTime, String, Text

from app.core.database import Base


class SiteSetting(Base):
    """Key-value store for site-wide configuration settings."""

    __tablename__ = "site_settings"

    key = Column(String(100), primary_key=True)
    value = Column(Text, nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )
