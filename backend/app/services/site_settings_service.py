"""Service layer for site settings management."""
import json
from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.models.site_setting import SiteSetting


def get_setting(db: Session, key: str) -> Optional[str]:
    """Get a single setting value by key."""
    setting = db.query(SiteSetting).filter(SiteSetting.key == key).first()
    return setting.value if setting else None


def get_all_settings(db: Session) -> Dict[str, Any]:
    """Get all settings as a dictionary with parsed JSON values."""
    settings = db.query(SiteSetting).all()
    result = {}
    for s in settings:
        try:
            result[s.key] = json.loads(s.value)
        except (json.JSONDecodeError, TypeError):
            result[s.key] = s.value
    return result


def get_public_settings(db: Session) -> Dict[str, Any]:
    """Get only whitelisted public settings (safe to expose without auth)."""
    PUBLIC_KEYS = [
        "enable_newsletter",
        "social_facebook",
        "social_instagram",
        "social_twitter",
        "social_tiktok",
        "social_youtube",
    ]
    all_settings = get_all_settings(db)
    return {k: v for k, v in all_settings.items() if k in PUBLIC_KEYS}


def upsert_setting(db: Session, key: str, value: Any) -> SiteSetting:
    """Create or update a single setting."""
    serialized = json.dumps(value)
    setting = db.query(SiteSetting).filter(SiteSetting.key == key).first()
    if setting:
        setting.value = serialized
        setting.updated_at = datetime.utcnow()
    else:
        setting = SiteSetting(
            key=key,
            value=serialized,
            updated_at=datetime.utcnow(),
        )
        db.add(setting)
    db.commit()
    db.refresh(setting)
    return setting


def upsert_settings(db: Session, settings_dict: Dict[str, Any]) -> Dict[str, Any]:
    """Bulk create or update settings."""
    for key, value in settings_dict.items():
        serialized = json.dumps(value)
        setting = db.query(SiteSetting).filter(SiteSetting.key == key).first()
        if setting:
            setting.value = serialized
            setting.updated_at = datetime.utcnow()
        else:
            setting = SiteSetting(
                key=key,
                value=serialized,
                updated_at=datetime.utcnow(),
            )
            db.add(setting)
    db.commit()
    return get_all_settings(db)
