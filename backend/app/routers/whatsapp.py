"""WhatsApp deep-link generation.

Returns a `wa.me` URL with a pre-filled message so customers can convert
through WhatsApp without exposing the configured number in the frontend
bundle. The number is stored in `SiteSetting` under key
`whatsapp_phone_number` and is never returned to the client directly —
only embedded inside the redirect URL at click time.
"""
import json
import re
from decimal import Decimal
from typing import List, Optional, Tuple
from urllib.parse import quote
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_optional_current_user
from app.models.product import Product
from app.models.service import ServicePackage
from app.models.user import User
from app.schemas.whatsapp import (
    WhatsAppCartRequest,
    WhatsAppGeneralRequest,
    WhatsAppLinkRequest,
    WhatsAppLinkResponse,
    WhatsAppProductRequest,
    WhatsAppServiceRequest,
)
from app.services import site_settings_service

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp"])

PHONE_KEY = "whatsapp_phone_number"
PHONE_REGEX = re.compile(r"^\d{8,15}$")


def _load_phone(db: Session) -> str:
    raw = site_settings_service.get_setting(db, PHONE_KEY)
    if not raw:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="WhatsApp ordering is not configured.",
        )
    # Stored values are JSON-encoded by upsert_setting.
    try:
        value = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        value = raw
    if not isinstance(value, str):
        value = str(value)
    digits = re.sub(r"\D", "", value)
    if not PHONE_REGEX.match(digits):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="WhatsApp number is configured incorrectly.",
        )
    return digits


def _fmt_ksh(amount: Decimal) -> str:
    # Whole-shilling display; WhatsApp messages are plain text.
    return f"KSh {amount:,.0f}"


def _site_base_url() -> str:
    return settings.FRONTEND_URL.rstrip("/")


def _product_url(product: Product) -> str:
    return f"{_site_base_url()}/products/{product.id}"


def _service_url(pkg: ServicePackage) -> str:
    # Public detail page — also the canonical URL used for social previews.
    return f"{_site_base_url()}/services/{pkg.id}"


def _service_starting_price(pkg: ServicePackage) -> Optional[Decimal]:
    candidates = [
        pkg.base_bride_price,
        pkg.base_maid_price,
        pkg.base_mother_price,
        pkg.base_other_price,
    ]
    prices = [Decimal(p) for p in candidates if p is not None]
    return min(prices) if prices else None


def _user_lines(user: Optional[User]) -> List[str]:
    if not user:
        return []
    lines = []
    if user.full_name:
        lines.append(f"Name: {user.full_name}")
    if user.email:
        lines.append(f"Email: {user.email}")
    return lines


def _build_product_message(
    db: Session, req: WhatsAppProductRequest, user: Optional[User]
) -> str:
    product = db.query(Product).filter(Product.id == req.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    price = Decimal(product.base_price)
    line_total = price * req.quantity
    lines = [
        "Hi Glam by Lynn — I'd like to order:",
        f"• {product.title} × {req.quantity} — {_fmt_ksh(line_total)}",
        f"  {_product_url(product)}",
        f"Total: {_fmt_ksh(line_total)}",
    ]
    lines.extend(_user_lines(user))
    return "\n".join(lines)


def _build_service_message(
    db: Session, req: WhatsAppServiceRequest, user: Optional[User]
) -> str:
    pkg = db.query(ServicePackage).filter(ServicePackage.id == req.service_id).first()
    if not pkg:
        raise HTTPException(status_code=404, detail="Service not found")
    price = _service_starting_price(pkg)
    price_str = f" — from {_fmt_ksh(price)}" if price is not None else ""
    lines = [
        "Hi Glam by Lynn — I'd like to book:",
        f"• {pkg.name}{price_str}",
        f"  {_service_url(pkg)}",
    ]
    if req.preferred_date:
        # Strip any control chars from the free-text date.
        safe_date = re.sub(r"[\x00-\x1f]", "", req.preferred_date)[:64]
        lines.append(f"Preferred date: {safe_date}")
    lines.extend(_user_lines(user))
    return "\n".join(lines)


def _build_cart_message(
    db: Session, req: WhatsAppCartRequest, user: Optional[User]
) -> str:
    if not req.items:
        raise HTTPException(status_code=400, detail="Cart is empty")
    ids = [item.product_id for item in req.items]
    products = {
        p.id: p
        for p in db.query(Product).filter(Product.id.in_(ids)).all()
    }
    item_lines: List[str] = []
    total = Decimal(0)
    for item in req.items:
        product = products.get(item.product_id)
        if not product:
            continue
        price = Decimal(product.base_price)
        line_total = price * item.quantity
        total += line_total
        item_lines.append(
            f"• {product.title} × {item.quantity} — {_fmt_ksh(line_total)}"
        )
        item_lines.append(f"  {_product_url(product)}")
    if not item_lines:
        raise HTTPException(status_code=404, detail="No valid items in cart")
    lines = ["Hi Glam by Lynn — I'd like to order:"]
    lines.extend(item_lines)
    lines.append(f"Total: {_fmt_ksh(total)}")
    lines.extend(_user_lines(user))
    return "\n".join(lines)


def _build_general_message(user: Optional[User]) -> str:
    lines = ["Hi Glam by Lynn — I have a question."]
    lines.extend(_user_lines(user))
    return "\n".join(lines)


@router.post(
    "/link",
    response_model=WhatsAppLinkResponse,
    summary="Generate a pre-filled WhatsApp redirect URL",
)
def generate_link(
    payload: WhatsAppLinkRequest = Body(..., discriminator="type"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    phone = _load_phone(db)

    if isinstance(payload, WhatsAppProductRequest):
        message = _build_product_message(db, payload, current_user)
    elif isinstance(payload, WhatsAppServiceRequest):
        message = _build_service_message(db, payload, current_user)
    elif isinstance(payload, WhatsAppCartRequest):
        message = _build_cart_message(db, payload, current_user)
    else:
        message = _build_general_message(current_user)

    url = f"https://wa.me/{phone}?text={quote(message)}"
    return WhatsAppLinkResponse(url=url)
