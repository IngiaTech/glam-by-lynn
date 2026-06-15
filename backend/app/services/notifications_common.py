"""Shared helpers for customer/admin notification emails.

Both booking and order notifications resolve the same things — the business
WhatsApp number, a Kenyan phone normalised for wa.me links, and a deep link to
message the customer. Keep that logic here so the two flows stay in sync.
"""
import json
import re
from typing import Optional
from urllib.parse import quote

from sqlalchemy.orm import Session

from app.services import site_settings_service

PHONE_KEY = "whatsapp_phone_number"


def resolve_business_phone(db: Session) -> Optional[str]:
    """Return the configured WhatsApp/business number as digits, or None."""
    raw = site_settings_service.get_setting(db, PHONE_KEY)
    if not raw:
        return None
    try:
        value = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        value = raw
    digits = re.sub(r"\D", "", str(value))
    return digits if 8 <= len(digits) <= 15 else None


def normalize_ke_phone(phone: str) -> Optional[str]:
    """Normalise a Kenyan phone number to wa.me digits (2547XXXXXXXX).

    Accepts 07XXXXXXXX / 01XXXXXXXX, +2547XXXXXXXX, or 2547XXXXXXXX.
    Returns None if it doesn't look like a usable number.
    """
    digits = re.sub(r"\D", "", phone or "")
    if digits.startswith("0") and len(digits) == 10:
        digits = "254" + digits[1:]
    elif digits.startswith("254") and len(digits) == 12:
        pass
    elif digits.startswith("7") or digits.startswith("1"):
        if len(digits) == 9:
            digits = "254" + digits
    return digits if 11 <= len(digits) <= 15 else None


def customer_contact_url(
    customer_phone: str, customer_name: str, reference: str
) -> Optional[str]:
    """wa.me link the team can use to message the customer.

    Points at the *customer's* number so the chat opens with them. ``reference``
    is the booking or order number to mention.
    """
    normalized = normalize_ke_phone(customer_phone)
    if not normalized:
        return None
    message = (
        f"Hi {customer_name}, this is Glam by Lynn regarding your {reference}."
    )
    return f"https://wa.me/{normalized}?text={quote(message)}"


def followup_url(phone: str, message: str) -> str:
    """wa.me link a customer can use to follow up, pointed at the business."""
    return f"https://wa.me/{phone}?text={quote(message)}"
