"""Order notification orchestration.

Gathers everything the customer- and admin-facing order emails need while the
request's DB session is still open, then schedules the actual sends on FastAPI
background tasks so a slow or failing mail provider never blocks (or fails) the
order itself. Mirrors ``booking_notifications`` so the two flows stay in sync.
"""
import logging
from decimal import Decimal
from typing import List, Optional

from fastapi import BackgroundTasks
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.order import Order
from app.models.user import User
from app.schemas.order import DeliveryInfo, GuestInfo
from app.services.email_service import email_service
from app.services.notifications_common import (
    customer_contact_url,
    followup_url,
    resolve_business_phone,
)

logger = logging.getLogger(__name__)


def _order_followup_url(phone: str, order_number: str) -> str:
    """wa.me link a customer can use to follow up on their order."""
    message = (
        "Hi Glam by Lynn — I'd like to follow up on my order.\n"
        f"Order number: {order_number}"
    )
    return followup_url(phone, message)


def schedule_order_notifications(
    db: Session,
    order: Order,
    items_data: List[dict],
    user: Optional[User],
    guest_info: Optional[GuestInfo],
    delivery_info: DeliveryInfo,
    background_tasks: BackgroundTasks,
) -> None:
    """Queue customer + admin emails for a freshly created order.

    Resolves all data up front (relationships, settings) so the background
    tasks receive plain values and don't touch the request-scoped session.
    """
    # Customer contact — guest fields take precedence, fall back to the
    # registered user's profile. Phone is stored on the order for both.
    customer_email = (
        guest_info.email if guest_info else None
    ) or (user.email if user else None)
    customer_name = (
        (guest_info.name if guest_info else None)
        or (user.full_name if user else None)
        or (user.email if user else None)
        or "there"
    )
    customer_phone = (
        order.guest_phone
        or (guest_info.phone if guest_info else None)
        or (user.phone_number if user else None)
        or ""
    )

    delivery_address = {
        "address": delivery_info.address,
        "city": delivery_info.town,
        "county": delivery_info.county,
    }

    phone = resolve_business_phone(db)
    order_followup = (
        _order_followup_url(phone, order.order_number) if phone else None
    )
    customer_wa_url = (
        customer_contact_url(
            customer_phone, customer_name, f"order {order.order_number}"
        )
        if customer_phone
        else None
    )
    admin_url = f"{settings.FRONTEND_URL.rstrip('/')}/admin/orders"

    subtotal = Decimal(order.subtotal or 0)
    discount = Decimal(order.discount_amount or 0)
    delivery_fee = Decimal(order.delivery_fee or 0)
    total = Decimal(order.total_amount or 0)

    # Customer notification
    if customer_email:
        logger.info(
            "Queuing customer order email for %s (order=%s)",
            customer_email, order.order_number,
        )
        background_tasks.add_task(
            email_service.send_order_confirmation,
            to_email=customer_email,
            order_number=order.order_number,
            customer_name=customer_name,
            order_items=items_data,
            subtotal=subtotal,
            discount=discount,
            delivery_fee=delivery_fee,
            total=total,
            delivery_address={**delivery_address, "full_name": customer_name, "phone": customer_phone},
            whatsapp_url=order_followup,
            call_number=phone,
        )
    else:
        logger.warning(
            "No customer email for order %s — skipping customer notification",
            order.order_number,
        )

    # Admin notification(s)
    admin_recipients: List[str] = list(settings.ADMIN_EMAILS or [])
    for admin_email in admin_recipients:
        background_tasks.add_task(
            email_service.send_order_admin_notification,
            to_email=admin_email,
            order_number=order.order_number,
            customer_name=customer_name,
            customer_email=customer_email or "Not provided",
            customer_phone=customer_phone or "Not provided",
            order_items=items_data,
            subtotal=subtotal,
            discount=discount,
            delivery_fee=delivery_fee,
            total=total,
            delivery_address=delivery_address,
            admin_url=admin_url,
            customer_whatsapp_url=customer_wa_url,
        )
