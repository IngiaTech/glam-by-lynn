"""Order API routes."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_optional_current_user
from app.models.user import User
from app.schemas.order import OrderCreate, OrderResponse, OrderListResponse
from app.services import order_service

router = APIRouter(tags=["Orders"])


@router.post(
    "/orders",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new order",
)
def create_order(
    order_data: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new order from user's cart.

    Validates cart items, checks stock availability, applies promo code if provided,
    calculates totals, generates order number, and clears cart after successful order creation.

    **Requirements:**
    - User must be authenticated
    - Cart must not be empty
    - All cart items must be in stock
    - Promo code must be valid (if provided)

    **Process:**
    1. Validates all cart items exist and are in stock
    2. Calculates subtotal from cart
    3. Applies promo code discount (if provided)
    4. Adds delivery fee based on location
    5. Creates order and order items
    6. Updates product stock
    7. Clears user's cart

    Returns:
        Created order with all items
    """
    success, message, order = order_service.create_order(
        db=db,
        user=current_user,
        guest_info=order_data.guest_info,
        delivery_info=order_data.delivery_info,
        promo_code=order_data.promo_code,
        payment_method=order_data.payment_method,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message,
        )

    return order


@router.get(
    "/orders/{order_id}",
    response_model=OrderResponse,
    summary="Get order by ID",
)
def get_order(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get a specific order by ID.

    Users can only access their own orders unless they are admin.
    """
    from uuid import UUID

    try:
        order_uuid = UUID(order_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid order ID format",
        )

    order = order_service.get_order_by_id(db, order_uuid)

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    # Check if user owns the order
    if order.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this order",
        )

    return order


@router.get(
    "/orders",
    response_model=OrderListResponse,
    summary="Get user's orders",
)
def get_user_orders(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get all orders for the current user with pagination.

    Query Parameters:
        skip: Number of records to skip (default: 0)
        limit: Maximum number of records to return (default: 20, max: 100)
    """
    if limit > 100:
        limit = 100

    orders, total = order_service.get_user_orders(
        db=db,
        user_id=current_user.id,
        skip=skip,
        limit=limit,
    )

    return OrderListResponse(
        orders=orders,
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/orders/track/{order_number}",
    response_model=OrderResponse,
    summary="Track order by order number",
)
def track_order(
    order_number: str,
    email: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_optional_current_user),
):
    """
    Track an order by order number.

    For guest orders, requires email parameter for verification.
    For authenticated users, allows tracking own orders.

    Query Parameters:
        email: Guest email for verification (required for guest orders)
    """
    order = order_service.get_order_by_number(db, order_number)

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    # If user is authenticated and owns the order, allow access
    if current_user and order.user_id == current_user.id:
        return order

    # For guest orders, verify email
    if order.guest_email:
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email required for guest order tracking",
            )

        if order.guest_email.lower() != email.lower():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Email does not match order",
            )

        return order

    # Order belongs to a different user and requester is not authenticated
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Not authorized to access this order",
    )
