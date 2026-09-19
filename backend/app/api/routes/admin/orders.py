"""Admin order management API endpoints."""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_admin_user
from app.models.user import User
from app.schemas.admin_order import (
    AdminOrderDeliveryUpdate,
    AdminOrderListResponse,
    AdminOrderResponse,
    AdminOrderStatusUpdate,
    AdminOrderUpdate,
)
from app.services import order_service

router = APIRouter(prefix="/admin/orders", tags=["admin", "orders"])


def _raise_for_value_error(error: ValueError) -> None:
    """Map a service ValueError to 404 for a missing order, 400 otherwise."""
    message = str(error)
    if "not found" in message.lower():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=message)
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)


@router.get("", response_model=AdminOrderListResponse)
def list_all_orders(
    order_status: Optional[str] = Query(None, alias="status", description="Filter by status"),
    payment_confirmed: Optional[bool] = Query(
        None, alias="paymentConfirmed", description="Filter by payment confirmation"
    ),
    search: Optional[str] = Query(
        None, description="Match order number, guest name or guest email"
    ),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=100, description="Maximum records to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """
    List every order in the shop, newest first (admin only).

    **Authentication required - Admin only**

    Distinct from `GET /api/orders`, which only ever returns the caller's own
    orders. Filters are applied in SQL, so `total` reflects the filtered set.
    """
    orders, total = order_service.get_all_orders(
        db=db,
        order_status=order_status,
        payment_confirmed=payment_confirmed,
        search=search,
        skip=skip,
        limit=limit,
    )

    return AdminOrderListResponse(orders=orders, total=total, skip=skip, limit=limit)


@router.get("/{order_id}", response_model=AdminOrderResponse)
def get_order(
    order_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Get a single order with its items, tracking number and admin notes.

    **Authentication required - Admin only**

    Raises:
    - 404: Order not found
    """
    order = order_service.get_order_by_id(db, order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
        )
    return order


@router.put("/{order_id}/status", response_model=AdminOrderResponse)
def update_order_status(
    order_id: UUID,
    status_data: AdminOrderStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Move an order to a new status (admin only).

    **Authentication required - Admin only**

    Allowed transitions:
    - pending → payment_confirmed, processing, cancelled
    - payment_confirmed → processing, shipped, cancelled
    - processing → shipped, cancelled
    - shipped → delivered, cancelled
    - delivered, cancelled → final

    Cancelling **restocks every item atomically** in the same transaction, and
    moving to `payment_confirmed` also sets the payment flag and timestamp.

    Raises:
    - 404: Order not found
    - 400: Unknown status, or the transition isn't allowed from where the order is
    """
    try:
        return order_service.admin_update_order_status(
            db=db,
            order_id=order_id,
            new_status=status_data.status,
            admin_notes=status_data.admin_notes,
        )
    except ValueError as e:
        _raise_for_value_error(e)


@router.put("/{order_id}/delivery", response_model=AdminOrderResponse)
def set_delivery_fee(
    order_id: UUID,
    delivery_data: AdminOrderDeliveryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Set the delivery fee agreed with the customer, and recompute the total.

    **Authentication required - Admin only**

    Orders are created with a fee of 0 because delivery cost is arranged
    per-order; this records the agreed figure. The total is recomputed from
    `subtotal - discount + fee`, so repeated edits don't compound.

    The customer is **not** emailed — delivery is arranged directly with them.

    Raises:
    - 404: Order not found
    - 400: Negative fee, or the order is cancelled
    """
    try:
        return order_service.admin_set_delivery_fee(
            db=db,
            order_id=order_id,
            delivery_fee=delivery_data.delivery_fee,
            admin_notes=delivery_data.admin_notes,
        )
    except ValueError as e:
        _raise_for_value_error(e)


@router.put("/{order_id}", response_model=AdminOrderResponse)
def update_order(
    order_id: UUID,
    order_data: AdminOrderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Update an order's fulfilment details (admin only).

    **Authentication required - Admin only**

    Covers the fields with no stock or money consequences: tracking number,
    payment flag and a free-text note. Status goes through `/status` and the
    fee through `/delivery`.

    Raises:
    - 404: Order not found
    """
    try:
        return order_service.admin_update_order(
            db=db,
            order_id=order_id,
            tracking_number=order_data.tracking_number,
            payment_confirmed=order_data.payment_confirmed,
            admin_notes=order_data.admin_notes,
        )
    except ValueError as e:
        _raise_for_value_error(e)
