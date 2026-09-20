"""Order service for business logic."""
import logging
import secrets
import string
from datetime import datetime
from decimal import Decimal
from typing import List, Optional, Tuple
from uuid import UUID

from fastapi import BackgroundTasks
from sqlalchemy import or_, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.order import Cart, CartItem, Order, OrderItem
from app.models.product import Product, ProductVariant
from app.models.user import User
from app.schemas.order import DeliveryInfo, GuestInfo, OrderItemCreate
from app.services import promo_code_service
from app.services.email_service import email_service
from app.services.order_notifications import schedule_order_notifications

logger = logging.getLogger(__name__)


def generate_order_number(db: Session = None) -> str:
    """
    Generate an order number.

    Format: ORD-YYYYMMDD-XXXXX where X is random alphanumeric.

    This no longer SELECTs to check the number is free. That check was a
    check-then-insert race: two concurrent orders could both find the same
    number unused and the loser would 500 on the unique constraint at commit.
    The constraint is the real guard; create_order retries on IntegrityError.

    `db` is accepted but unused, so existing callers don't need changing.
    """
    date_part = datetime.utcnow().strftime("%Y%m%d")
    random_part = "".join(
        secrets.choice(string.ascii_uppercase + string.digits) for _ in range(5)
    )
    return f"ORD-{date_part}-{random_part}"


def validate_cart_and_calculate_totals(
    db: Session, cart: Cart
) -> Tuple[bool, str, Decimal, List[dict]]:
    """
    Validate cart items and calculate order totals.

    Args:
        db: Database session
        cart: User's cart

    Returns:
        Tuple of (is_valid, error_message, subtotal, items_data)
    """
    if not cart or cart.cart_items.count() == 0:
        return False, "Cart is empty", Decimal(0), []

    subtotal = Decimal(0)
    items_data = []

    for cart_item in cart.cart_items:
        # Get product
        product = db.query(Product).filter(Product.id == cart_item.product_id).first()

        if not product:
            return False, f"Product not found", Decimal(0), []

        if not product.is_active:
            return False, f"Product '{product.title}' is no longer available", Decimal(0), []

        # Check stock availability
        if product.inventory_count < cart_item.quantity:
            return (
                False,
                f"Insufficient stock for '{product.title}'. Available: {product.inventory_count}",
                Decimal(0),
                [],
            )

        # Get variant if specified
        variant = None
        if cart_item.product_variant_id:
            variant = (
                db.query(ProductVariant)
                .filter(ProductVariant.id == cart_item.product_variant_id)
                .first()
            )

            if not variant:
                return False, f"Product variant not found", Decimal(0), []

            if variant.inventory_count < cart_item.quantity:
                return (
                    False,
                    f"Insufficient stock for '{product.title}' variant. Available: {variant.inventory_count}",
                    Decimal(0),
                    [],
                )

        # Calculate price (base price + variant adjustment)
        unit_price = product.base_price + (variant.price_adjustment if variant else Decimal(0))

        # Calculate item total
        item_total = unit_price * cart_item.quantity
        subtotal += item_total

        # Store item data
        items_data.append({
            "product_id": product.id,
            "product_variant_id": variant.id if variant else None,
            "product_title": product.title,
            "product_sku": variant.sku if variant else product.sku,
            "quantity": cart_item.quantity,
            "unit_price": unit_price,
            "total_price": item_total,
        })

    return True, "", subtotal, items_data


def validate_inline_items_and_calculate_totals(
    db: Session, cart_items: List[OrderItemCreate]
) -> Tuple[bool, str, Decimal, List[dict]]:
    """
    Validate a list of inline cart items (guest checkout) and calculate totals.

    Mirrors validate_cart_and_calculate_totals but operates on a list of
    OrderItemCreate payloads instead of a persisted Cart row. Used when a
    guest submits the bag contents directly with the order request.
    """
    if not cart_items:
        return False, "Cart is empty", Decimal(0), []

    # Deduplicate: if the same product/variant appears twice, sum the quantity
    merged: dict = {}
    for ci in cart_items:
        key = (ci.product_id, ci.product_variant_id)
        merged[key] = merged.get(key, 0) + ci.quantity

    subtotal = Decimal(0)
    items_data = []

    for (product_id, variant_id), quantity in merged.items():
        product = db.query(Product).filter(Product.id == product_id).first()

        if not product:
            return False, "Product not found", Decimal(0), []

        if not product.is_active:
            return False, f"Product '{product.title}' is no longer available", Decimal(0), []

        if product.inventory_count < quantity:
            return (
                False,
                f"Insufficient stock for '{product.title}'. Available: {product.inventory_count}",
                Decimal(0),
                [],
            )

        variant = None
        if variant_id:
            variant = (
                db.query(ProductVariant)
                .filter(ProductVariant.id == variant_id)
                .first()
            )

            if not variant:
                return False, "Product variant not found", Decimal(0), []

            if variant.inventory_count < quantity:
                return (
                    False,
                    f"Insufficient stock for '{product.title}' variant. Available: {variant.inventory_count}",
                    Decimal(0),
                    [],
                )

        unit_price = product.base_price + (variant.price_adjustment if variant else Decimal(0))
        item_total = unit_price * quantity
        subtotal += item_total

        items_data.append({
            "product_id": product.id,
            "product_variant_id": variant.id if variant else None,
            "product_title": product.title,
            "product_sku": variant.sku if variant else product.sku,
            "quantity": quantity,
            "unit_price": unit_price,
            "total_price": item_total,
        })

    return True, "", subtotal, items_data


def create_order(
    db: Session,
    user: Optional[User],
    guest_info: Optional[GuestInfo],
    delivery_info: DeliveryInfo,
    promo_code: Optional[str],
    payment_method: Optional[str],
    cart_items: Optional[List[OrderItemCreate]] = None,
    contact_phone: Optional[str] = None,
    background_tasks: Optional[BackgroundTasks] = None,
) -> Tuple[bool, str, Optional[Order]]:
    """
    Create an order, retrying once if the generated order number collides.

    Order numbers carry a random 5-character suffix, so a same-day collision is
    about 1 in 36^5 — rare, but it used to surface as a 500 for the losing
    customer. The unique constraint raises IntegrityError at commit; we roll
    back and run the whole creation again rather than just retrying the commit,
    because the rollback also discards the stock decrements, the promo-usage
    increment and the cart clear. Re-running re-reads and re-validates all of
    them, so the retry is equivalent to a fresh attempt.

    See _create_order_once for the argument documentation.
    """
    for attempt in range(2):
        try:
            return _create_order_once(
                db=db,
                user=user,
                guest_info=guest_info,
                delivery_info=delivery_info,
                promo_code=promo_code,
                payment_method=payment_method,
                cart_items=cart_items,
                contact_phone=contact_phone,
                background_tasks=background_tasks,
            )
        except IntegrityError:
            db.rollback()
            if attempt == 1:
                raise
            logger.warning(
                "Order creation hit an integrity error; retrying with a new order number"
            )


def _create_order_once(
    db: Session,
    user: Optional[User],
    guest_info: Optional[GuestInfo],
    delivery_info: DeliveryInfo,
    promo_code: Optional[str],
    payment_method: Optional[str],
    cart_items: Optional[List[OrderItemCreate]] = None,
    contact_phone: Optional[str] = None,
    background_tasks: Optional[BackgroundTasks] = None,
) -> Tuple[bool, str, Optional[Order]]:
    """
    Create a new order from the user's bag.

    For authenticated users, items are read from the persisted cart and
    `cart_items` is ignored. For guest checkout, `guest_info` and `cart_items`
    must both be supplied (the items travel with the request since guests do
    not have a server-side cart).

    Args:
        db: Database session
        user: Authenticated user (None for guest checkout)
        guest_info: Guest customer info (required if user is None)
        delivery_info: Delivery address
        promo_code: Optional promo code
        payment_method: Payment method chosen
        cart_items: Inline items for guest checkout
        contact_phone: Phone for authenticated checkout (accounts have no phone
            field); stored on the order so we can reach the customer. Ignored
            for guests, whose phone comes from guest_info.
        background_tasks: FastAPI background tasks used to send the customer +
            admin emails without blocking (or failing) the order. If omitted,
            the customer email is sent synchronously as a fallback.

    Returns:
        Tuple of (success, message, order)
    """
    # Validate caller supplied the right combination of fields
    if not user:
        if not guest_info:
            return False, "Guest information required for guest checkout", None
        if not cart_items:
            return False, "Cart is empty", None

    # Get cart and validate items
    cart = None
    if user:
        cart = db.query(Cart).filter(Cart.user_id == user.id).first()
        if not cart or cart.cart_items.count() == 0:
            return False, "Cart is empty", None
        is_valid, error_msg, subtotal, items_data = validate_cart_and_calculate_totals(db, cart)
    else:
        is_valid, error_msg, subtotal, items_data = validate_inline_items_and_calculate_totals(
            db, cart_items or []
        )

    if not is_valid:
        return False, error_msg, None

    # Delivery fee is determined manually by the admin when confirming the
    # order (the customer is contacted with the delivery cost), so it starts at
    # 0 and is not part of the total at checkout time.
    delivery_fee = Decimal(0)

    # Calculate order total
    order_total = subtotal + delivery_fee

    # Apply promo code if provided
    discount_amount = Decimal(0)
    promo_code_id = None

    if promo_code:
        is_valid, message, discount, promo_obj = promo_code_service.validate_promo_code(
            db, promo_code, order_total
        )

        if not is_valid:
            return False, message, None

        discount_amount = discount or Decimal(0)
        promo_code_id = promo_obj.id if promo_obj else None

        # Recalculate total with discount
        order_total -= discount_amount

    # Generate unique order number
    order_number = generate_order_number(db)

    # Create order
    order = Order(
        order_number=order_number,
        user_id=user.id if user else None,
        guest_email=guest_info.email if guest_info else None,
        guest_name=guest_info.name if guest_info else None,
        # Phone always lands in guest_phone: from guest_info for guests, from
        # the checkout's contact field for signed-in users (accounts store no
        # phone). It's how we reach the customer about the order.
        guest_phone=(guest_info.phone if guest_info else contact_phone) or None,
        delivery_county=delivery_info.county,
        delivery_town=delivery_info.town,
        delivery_address=delivery_info.address,
        subtotal=subtotal,
        discount_amount=discount_amount,
        promo_code_id=promo_code_id,
        delivery_fee=delivery_fee,
        total_amount=order_total,
        payment_method=payment_method,
        status="pending",
    )

    db.add(order)
    db.flush()  # Get order ID

    # Create order items and update stock
    for item_data in items_data:
        order_item = OrderItem(
            order_id=order.id,
            product_id=item_data["product_id"],
            product_variant_id=item_data["product_variant_id"],
            product_title=item_data["product_title"],
            product_sku=item_data["product_sku"],
            quantity=item_data["quantity"],
            unit_price=item_data["unit_price"],
            discount=Decimal(0),
            total_price=item_data["total_price"],
        )
        db.add(order_item)

        # Decrement stock atomically. The guarded UPDATE (only decrements when
        # enough stock remains) plus the rowcount check prevents two concurrent
        # orders from both passing the earlier validation and overselling — a
        # plain read-modify-write would lose one update under READ COMMITTED.
        result = db.execute(
            update(Product)
            .where(
                Product.id == item_data["product_id"],
                Product.inventory_count >= item_data["quantity"],
            )
            .values(inventory_count=Product.inventory_count - item_data["quantity"])
        )
        if result.rowcount == 0:
            db.rollback()
            return False, f"Insufficient stock for '{item_data['product_title']}'", None

        if item_data["product_variant_id"]:
            variant_result = db.execute(
                update(ProductVariant)
                .where(
                    ProductVariant.id == item_data["product_variant_id"],
                    ProductVariant.inventory_count >= item_data["quantity"],
                )
                .values(
                    inventory_count=ProductVariant.inventory_count - item_data["quantity"]
                )
            )
            if variant_result.rowcount == 0:
                db.rollback()
                return (
                    False,
                    f"Insufficient stock for '{item_data['product_title']}' variant",
                    None,
                )

    # Increment promo code usage if used. This is the authoritative usage-limit
    # gate: the atomic UPDATE only increments while the code is under its limit,
    # so concurrent checkouts can't push it past usage_limit. No internal commit
    # here — the whole order commits once below, so a crash can't leave the order
    # persisted with the cart un-cleared (which would let the user re-order).
    if promo_code_id:
        if not promo_code_service.increment_usage_if_available(db, promo_code_id):
            db.rollback()
            return False, "This promo code has reached its usage limit", None

    # Clear cart
    if cart:
        for cart_item in cart.cart_items:
            db.delete(cart_item)

    # Commit the entire order (order, items, stock, promo, cart clear) atomically
    db.commit()
    db.refresh(order)

    # Notify the customer and admin. Sends run on background tasks so a slow or
    # failing mail provider never blocks (or fails) the order — it's already
    # persisted and the user has seen the confirmation page. When no
    # background_tasks is supplied (e.g. non-route callers), fall back to a
    # synchronous customer email.
    if background_tasks is not None:
        schedule_order_notifications(
            db=db,
            order=order,
            items_data=items_data,
            user=user,
            guest_info=guest_info,
            delivery_info=delivery_info,
            background_tasks=background_tasks,
        )
    else:
        _send_order_confirmation_email(
            order=order,
            items_data=items_data,
            user=user,
            guest_info=guest_info,
            delivery_info=delivery_info,
        )

    return True, "Order created successfully", order


def _send_order_confirmation_email(
    order: Order,
    items_data: List[dict],
    user: Optional[User],
    guest_info: Optional[GuestInfo],
    delivery_info: DeliveryInfo,
) -> None:
    """
    Send the order confirmation email for both authenticated and guest orders.

    Swallows exceptions so email issues never break the order flow.
    """
    try:
        if user:
            to_email = user.email
            customer_name = user.full_name or user.email
            phone = guest_info.phone if guest_info else ""
        elif guest_info:
            to_email = guest_info.email
            customer_name = guest_info.name
            phone = guest_info.phone
        else:
            return

        if not to_email:
            return

        delivery_address = {
            "full_name": customer_name,
            "phone": phone,
            "address": delivery_info.address,
            "city": delivery_info.town,
            "county": delivery_info.county,
        }

        email_service.send_order_confirmation(
            to_email=to_email,
            order_number=order.order_number,
            customer_name=customer_name,
            order_items=items_data,
            subtotal=order.subtotal,
            discount=order.discount_amount,
            delivery_fee=order.delivery_fee,
            total=order.total_amount,
            delivery_address=delivery_address,
        )
    except Exception as e:
        logger.warning(
            f"Failed to send order confirmation email for order {order.order_number}: {e}"
        )


def get_order_by_id(db: Session, order_id: UUID) -> Optional[Order]:
    """Get an order by ID."""
    return db.query(Order).filter(Order.id == order_id).first()


def get_order_by_number(db: Session, order_number: str) -> Optional[Order]:
    """Get an order by order number."""
    return db.query(Order).filter(Order.order_number == order_number).first()


def get_user_orders(
    db: Session, user_id: UUID, skip: int = 0, limit: int = 20
) -> Tuple[List[Order], int]:
    """
    Get orders for a user with pagination.

    Args:
        db: Database session
        user_id: User ID
        skip: Number of records to skip
        limit: Maximum number of records to return

    Returns:
        Tuple of (orders list, total count)
    """
    query = db.query(Order).filter(Order.user_id == user_id)

    total = query.count()

    orders = query.order_by(Order.created_at.desc()).offset(skip).limit(limit).all()

    return orders, total


# ---------------------------------------------------------------------------
# Admin order lifecycle
# ---------------------------------------------------------------------------

# Allowed status transitions. Orders move forward through fulfilment and can be
# cancelled from any live state; 'delivered' and 'cancelled' are terminal, so a
# cancel (and therefore a restock) can only ever happen once per order.
ORDER_STATUS_TRANSITIONS = {
    "pending": {"payment_confirmed", "processing", "cancelled"},
    "payment_confirmed": {"processing", "shipped", "cancelled"},
    "processing": {"shipped", "cancelled"},
    "shipped": {"delivered", "cancelled"},
    "delivered": set(),
    "cancelled": set(),
}


def _append_admin_note(order: Order, note: str, admin_notes: Optional[str] = None) -> None:
    """Append a timestamped note to the order's admin notes, mirroring bookings."""
    existing_notes = order.admin_notes or ""
    entry = f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M')}] {note}"
    if admin_notes:
        entry += f": {admin_notes}"
    order.admin_notes = existing_notes + entry


def get_all_orders(
    db: Session,
    order_status: Optional[str] = None,
    payment_confirmed: Optional[bool] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
) -> Tuple[List[Order], int]:
    """
    Get every order in the shop, newest first (admin only).

    Distinct from get_user_orders, which is scoped to one customer. Filtering
    happens in SQL so pagination counts are correct.

    Args:
        db: Database session
        order_status: Optional status filter
        payment_confirmed: Optional payment-confirmed filter
        search: Case-insensitive match on order number, guest name or email
        skip: Number of records to skip
        limit: Maximum number of records to return

    Returns:
        Tuple of (orders list, total count matching the filters)
    """
    query = db.query(Order)

    if order_status:
        query = query.filter(Order.status == order_status)

    if payment_confirmed is not None:
        query = query.filter(Order.payment_confirmed == payment_confirmed)

    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Order.order_number.ilike(term),
                Order.guest_name.ilike(term),
                Order.guest_email.ilike(term),
            )
        )

    total = query.count()
    orders = query.order_by(Order.created_at.desc()).offset(skip).limit(limit).all()

    return orders, total


def _restock_order_items(db: Session, order: Order) -> None:
    """
    Return a cancelled order's items to inventory.

    Uses the same guarded-UPDATE style as the decrement in create_order: the
    increment happens in SQL rather than as a read-modify-write, so a concurrent
    order placed on the same product can't lose one of the two updates.

    Does not commit — the caller commits the cancellation and the restock
    together, so stock can never be returned for an order that stayed live.
    """
    for item in order.order_items:
        if item.product_id:
            db.execute(
                update(Product)
                .where(Product.id == item.product_id)
                .values(inventory_count=Product.inventory_count + item.quantity)
            )

        if item.product_variant_id:
            db.execute(
                update(ProductVariant)
                .where(ProductVariant.id == item.product_variant_id)
                .values(
                    inventory_count=ProductVariant.inventory_count + item.quantity
                )
            )


def admin_update_order_status(
    db: Session,
    order_id: UUID,
    new_status: str,
    admin_notes: Optional[str] = None,
) -> Order:
    """
    Move an order to a new status (admin only).

    Cancelling restocks every item atomically in the same transaction. Stock is
    decremented when the order is created, so a cancellation from any live
    status returns it; 'cancelled' is terminal, so this can't double-restock.

    Args:
        db: Database session
        order_id: Order ID
        new_status: Target status
        admin_notes: Optional note recorded with the change

    Returns:
        The updated order

    Raises:
        ValueError: If the order is not found, the status is unknown, or the
            transition is not allowed from the order's current status.
    """
    if new_status not in ORDER_STATUS_TRANSITIONS:
        valid = ", ".join(sorted(ORDER_STATUS_TRANSITIONS))
        raise ValueError(f"Invalid status '{new_status}'. Must be one of: {valid}")

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise ValueError(f"Order with ID {order_id} not found")

    current_status = order.status

    if new_status == current_status:
        raise ValueError(f"Order is already '{current_status}'")

    allowed = ORDER_STATUS_TRANSITIONS[current_status]
    if new_status not in allowed:
        if not allowed:
            raise ValueError(
                f"Order is '{current_status}', which is final and cannot be changed"
            )
        raise ValueError(
            f"Cannot move an order from '{current_status}' to '{new_status}'. "
            f"Allowed: {', '.join(sorted(allowed))}"
        )

    order.status = new_status
    _append_admin_note(
        order, f"Status changed from '{current_status}' to '{new_status}'", admin_notes
    )

    # Confirming payment via the status is the same event as the payment flag;
    # keep the two from drifting apart.
    if new_status == "payment_confirmed" and not order.payment_confirmed:
        order.payment_confirmed = True
        order.payment_confirmed_at = datetime.utcnow()

    if new_status == "cancelled":
        _restock_order_items(db, order)

    db.commit()
    db.refresh(order)

    return order


def admin_set_delivery_fee(
    db: Session,
    order_id: UUID,
    delivery_fee: Decimal,
    admin_notes: Optional[str] = None,
) -> Order:
    """
    Set the delivery fee an admin agreed with the customer, and recompute the total.

    Orders are created with a delivery fee of 0 because the cost is arranged
    per-order (see M10); this is where that agreed figure lands.

    Args:
        db: Database session
        order_id: Order ID
        delivery_fee: The agreed fee; must not be negative
        admin_notes: Optional note recorded with the change

    Returns:
        The updated order

    Raises:
        ValueError: If the order is not found, the fee is negative, or the
            order is already cancelled.
    """
    if delivery_fee < 0:
        raise ValueError("Delivery fee cannot be negative")

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise ValueError(f"Order with ID {order_id} not found")

    if order.status == "cancelled":
        raise ValueError("Cannot change the delivery fee on a cancelled order")

    previous_fee = order.delivery_fee or Decimal(0)

    # Recompute from the stored components rather than adjusting the existing
    # total, so repeated edits can't accumulate rounding or double-count a fee.
    order.delivery_fee = delivery_fee
    order.total_amount = order.subtotal - (order.discount_amount or Decimal(0)) + delivery_fee

    _append_admin_note(
        order, f"Delivery fee set to {delivery_fee} (was {previous_fee})", admin_notes
    )

    db.commit()
    db.refresh(order)

    return order


def admin_update_order(
    db: Session,
    order_id: UUID,
    tracking_number: Optional[str] = None,
    payment_confirmed: Optional[bool] = None,
    admin_notes: Optional[str] = None,
) -> Order:
    """
    Update an order's fulfilment details (admin only).

    Covers the fields that carry no stock or money consequences: the tracking
    number, the payment flag, and a free-text note. Status changes go through
    admin_update_order_status and the fee through admin_set_delivery_fee.

    Args:
        db: Database session
        order_id: Order ID
        tracking_number: Courier tracking reference; "" clears it
        payment_confirmed: Whether payment has been received
        admin_notes: Optional note recorded with the change

    Returns:
        The updated order

    Raises:
        ValueError: If the order is not found.
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise ValueError(f"Order with ID {order_id} not found")

    changes = []

    if tracking_number is not None:
        order.tracking_number = tracking_number or None
        changes.append(
            f"Tracking number set to '{tracking_number}'"
            if tracking_number
            else "Tracking number cleared"
        )

    if payment_confirmed is not None and payment_confirmed != order.payment_confirmed:
        order.payment_confirmed = payment_confirmed
        order.payment_confirmed_at = datetime.utcnow() if payment_confirmed else None
        changes.append(
            "Payment marked as received" if payment_confirmed else "Payment marked as unpaid"
        )

    if changes or admin_notes:
        _append_admin_note(order, "; ".join(changes) or "Note added", admin_notes)

    db.commit()
    db.refresh(order)

    return order
