"""Analytics service for business intelligence."""
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models.booking import Booking
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.service import ServicePackage
from app.models.user import User


def get_overview_stats(db: Session, start_date: datetime, end_date: datetime) -> dict:
    """
    Get overview statistics for the dashboard.

    Args:
        db: Database session
        start_date: Start date for the period
        end_date: End date for the period

    Returns:
        Dictionary with overview statistics
    """
    # Total revenue from orders in period
    total_revenue = (
        db.query(func.sum(Order.total_amount))
        .filter(
            Order.created_at >= start_date,
            Order.created_at <= end_date,
            Order.payment_confirmed == True,
        )
        .scalar()
        or Decimal(0)
    )

    # Total orders in period
    total_orders = (
        db.query(func.count(Order.id))
        .filter(Order.created_at >= start_date, Order.created_at <= end_date)
        .scalar()
        or 0
    )

    # Total bookings in period
    total_bookings = (
        db.query(func.count(Booking.id))
        .filter(Booking.created_at >= start_date, Booking.created_at <= end_date)
        .scalar()
        or 0
    )

    # Total products (all time)
    total_products = db.query(func.count(Product.id)).filter(Product.is_active == True).scalar() or 0

    # Total customers (all time)
    total_customers = db.query(func.count(User.id)).scalar() or 0

    # Pending orders
    pending_orders = (
        db.query(func.count(Order.id)).filter(Order.status == "pending").scalar() or 0
    )

    # Pending bookings
    pending_bookings = (
        db.query(func.count(Booking.id)).filter(Booking.status == "pending").scalar() or 0
    )

    # Calculate change percentages (compare with previous period)
    previous_start = start_date - (end_date - start_date)
    previous_end = start_date

    previous_revenue = (
        db.query(func.sum(Order.total_amount))
        .filter(
            Order.created_at >= previous_start,
            Order.created_at < previous_end,
            Order.payment_confirmed == True,
        )
        .scalar()
        or Decimal(0)
    )

    previous_orders = (
        db.query(func.count(Order.id))
        .filter(Order.created_at >= previous_start, Order.created_at < previous_end)
        .scalar()
        or 0
    )

    revenue_change = None
    if previous_revenue > 0:
        revenue_change = float(((total_revenue - previous_revenue) / previous_revenue) * 100)

    orders_change = None
    if previous_orders > 0:
        orders_change = ((total_orders - previous_orders) / previous_orders) * 100

    return {
        "totalRevenue": total_revenue,
        "totalOrders": total_orders,
        "totalBookings": total_bookings,
        "totalProducts": total_products,
        "totalCustomers": total_customers,
        "pendingOrders": pending_orders,
        "pendingBookings": pending_bookings,
        "revenueChangePercent": revenue_change,
        "ordersChangePercent": orders_change,
    }


# get_sales_analytics / get_product_analytics / get_booking_analytics were
# removed with the endpoints that called them (Cut List). get_overview_stats is
# the only analytics the dashboard actually requests.


def get_recent_activity(db: Session, limit: int = 8) -> List[dict]:
    """
    The most recently placed orders and bookings, newest first.

    Feeds the dashboard's "Recent Activity" panel, which used to render a
    hardcoded array ("New order #1234 placed — 2 minutes ago") regardless of
    what had actually happened.

    Ordered by created_at — when the order or booking was *placed*. The admin
    bookings list can't serve this: it sorts by booking_date, the event date,
    so a booking made a minute ago for next week can sit behind ones made
    months ago for next year.

    Each source is limited to `limit` before merging, which is enough to fill
    `limit` slots whatever the split between them.
    """
    orders = (
        db.query(Order)
        .options(joinedload(Order.user))
        .order_by(Order.created_at.desc())
        .limit(limit)
        .all()
    )
    bookings = (
        db.query(Booking)
        .options(joinedload(Booking.user), joinedload(Booking.package))
        .order_by(Booking.created_at.desc())
        .limit(limit)
        .all()
    )

    def customer(record) -> str:
        if record.user and record.user.full_name:
            return record.user.full_name
        return record.guest_name or "a customer"

    items = [
        {
            "type": "order",
            "id": order.id,
            "reference": order.order_number,
            "summary": f"Order {order.order_number} placed by {customer(order)}",
            "status": order.status,
            "amount": order.total_amount,
            "created_at": order.created_at,
        }
        for order in orders
    ] + [
        {
            "type": "booking",
            "id": booking.id,
            "reference": booking.booking_number,
            "summary": (
                f"{booking.package.name if booking.package else 'Booking'} "
                f"booked by {customer(booking)} for {booking.booking_date:%d %b %Y}"
            ),
            "status": booking.status,
            "amount": booking.total_amount,
            "created_at": booking.created_at,
        }
        for booking in bookings
    ]

    items.sort(key=lambda item: item["created_at"], reverse=True)
    return items[:limit]
