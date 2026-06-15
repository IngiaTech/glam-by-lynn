"""Booking notification orchestration.

Gathers everything the customer- and admin-facing emails need while the
request's DB session is still open, then schedules the actual sends on
FastAPI background tasks so a slow or failing mail provider never blocks
(or fails) the booking itself.
"""
import logging
from decimal import Decimal
from typing import List

from fastapi import BackgroundTasks
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.booking import Booking
from app.services.email_service import email_service
from app.services.notifications_common import (
    customer_contact_url,
    followup_url,
    resolve_business_phone,
)

logger = logging.getLogger(__name__)


def _booking_followup_url(phone: str, booking_number: str) -> str:
    """wa.me link a customer can use to follow up on their booking."""
    message = (
        "Hi Glam by Lynn — I'd like to follow up on my booking.\n"
        f"Booking number: {booking_number}"
    )
    return followup_url(phone, message)


def _format_attendees(booking: Booking) -> str:
    parts = []
    pairs = [
        (booking.num_brides, "bride", "brides"),
        (booking.num_maids, "maid", "maids"),
        (booking.num_mothers, "mother", "mothers"),
        (booking.num_others, "other", "others"),
    ]
    for count, singular, plural in pairs:
        if count and count > 0:
            parts.append(f"{count} {singular if count == 1 else plural}")
    return ", ".join(parts) if parts else "Not specified"


def _location_text(booking: Booking) -> str:
    if booking.custom_location_address:
        return booking.custom_location_address
    if booking.location and getattr(booking.location, "location_name", None):
        return booking.location.location_name
    return "To be confirmed"


def schedule_booking_notifications(
    db: Session,
    booking: Booking,
    background_tasks: BackgroundTasks,
) -> None:
    """Queue customer + admin emails for a freshly created booking.

    Resolves all data up front (relationships, settings) so the background
    tasks receive plain values and don't touch the request-scoped session.
    """
    # Customer contact — guest fields take precedence, fall back to the
    # registered user's profile.
    customer_email = booking.guest_email or (booking.user.email if booking.user else None)
    customer_name = (
        booking.guest_name
        or (booking.user.full_name if booking.user else None)
        or "there"
    )
    customer_phone = booking.guest_phone or (
        booking.user.phone_number if booking.user else None
    ) or ""

    service_name = booking.package.name if booking.package else "Makeup service"
    location = _location_text(booking)
    attendees = _format_attendees(booking)
    subtotal = Decimal(booking.subtotal or 0)
    deposit = Decimal(booking.deposit_amount or 0)

    phone = resolve_business_phone(db)
    booking_followup_url = (
        _booking_followup_url(phone, booking.booking_number) if phone else None
    )
    customer_wa_url = (
        customer_contact_url(
            customer_phone, customer_name, f"booking {booking.booking_number}"
        )
        if customer_phone
        else None
    )
    admin_url = f"{settings.FRONTEND_URL.rstrip('/')}/admin/bookings"

    # Customer notification
    if customer_email:
        logger.info(
            "Queuing customer booking email for %s (booking=%s)",
            customer_email, booking.booking_number,
        )
        background_tasks.add_task(
            email_service.send_booking_received_customer,
            to_email=customer_email,
            booking_number=booking.booking_number,
            customer_name=customer_name,
            service_name=service_name,
            booking_date=booking.booking_date,
            location=location,
            subtotal=subtotal,
            deposit=deposit,
            whatsapp_url=booking_followup_url,
            call_number=phone,
        )
    else:
        logger.warning(
            "No customer email for booking %s — skipping customer notification",
            booking.booking_number,
        )

    # Admin notification(s)
    admin_recipients: List[str] = list(settings.ADMIN_EMAILS or [])
    for admin_email in admin_recipients:
        background_tasks.add_task(
            email_service.send_booking_admin_notification,
            to_email=admin_email,
            booking_number=booking.booking_number,
            customer_name=customer_name,
            customer_email=customer_email or "Not provided",
            customer_phone=customer_phone or "Not provided",
            service_name=service_name,
            booking_date=booking.booking_date,
            location=location,
            location_description=booking.location_description,
            attendees=attendees,
            subtotal=subtotal,
            special_requests=booking.special_requests,
            admin_url=admin_url,
            customer_whatsapp_url=customer_wa_url,
        )
