"""Admin analytics routes."""
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_admin_user
from app.models.user import User
from app.schemas.analytics import (
    BookingAnalytics,
    OverviewStats,
    ProductAnalytics,
    SalesAnalytics,
)
from app.services import analytics_service

router = APIRouter(tags=["Admin Analytics"])


@router.get(
    "/admin/analytics/overview",
    response_model=OverviewStats,
    summary="Get overview statistics (admin only)",
)
def get_overview_analytics(
    start_date: Optional[datetime] = Query(
        None,
        alias="startDate",
        description="Start date for analytics period (ISO format)",
    ),
    end_date: Optional[datetime] = Query(
        None,
        alias="endDate",
        description="End date for analytics period (ISO format)",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Get overview statistics for the admin dashboard.

    Returns key metrics including revenue, orders, bookings, products, customers,
    and comparison with the previous period.
    """
    # Default to last 30 days if not specified
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    stats = analytics_service.get_overview_stats(db, start_date, end_date)
    return OverviewStats(**stats)


@router.get(
    "/admin/analytics/sales",
    response_model=SalesAnalytics,
    summary="Get sales analytics (admin only)",
)
def get_sales_analytics(
    start_date: Optional[datetime] = Query(
        None,
        alias="startDate",
        description="Start date for analytics period",
    ),
    end_date: Optional[datetime] = Query(
        None,
        alias="endDate",
        description="End date for analytics period",
    ),
    interval: str = Query(
        "day",
        description="Time interval for data points ('day', 'week', 'month')",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Get sales analytics with time series data.

    Returns revenue, order counts, and average order value over time.
    """
    # Default to last 30 days if not specified
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    analytics = analytics_service.get_sales_analytics(db, start_date, end_date, interval)
    return SalesAnalytics(**analytics)


@router.get(
    "/admin/analytics/products",
    response_model=ProductAnalytics,
    summary="Get product analytics (admin only)",
)
def get_product_analytics(
    start_date: Optional[datetime] = Query(
        None,
        alias="startDate",
        description="Start date for analytics period",
    ),
    end_date: Optional[datetime] = Query(
        None,
        alias="endDate",
        description="End date for analytics period",
    ),
    limit: int = Query(
        10,
        ge=1,
        le=50,
        description="Number of top products to return",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Get product performance analytics.

    Returns top selling products by revenue and stock information.
    """
    # Default to last 30 days if not specified
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    analytics = analytics_service.get_product_analytics(db, start_date, end_date, limit)
    return ProductAnalytics(**analytics)


@router.get(
    "/admin/analytics/bookings",
    response_model=BookingAnalytics,
    summary="Get booking analytics (admin only)",
)
def get_booking_analytics(
    start_date: Optional[datetime] = Query(
        None,
        alias="startDate",
        description="Start date for analytics period",
    ),
    end_date: Optional[datetime] = Query(
        None,
        alias="endDate",
        description="End date for analytics period",
    ),
    interval: str = Query(
        "day",
        description="Time interval for data points ('day', 'week', 'month')",
    ),
    limit: int = Query(
        5,
        ge=1,
        le=20,
        description="Number of top services to return",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Get booking analytics with time series data.

    Returns booking counts, revenue, status distribution, and top services.
    """
    # Default to last 30 days if not specified
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    analytics = analytics_service.get_booking_analytics(db, start_date, end_date, interval, limit)
    return BookingAnalytics(**analytics)
