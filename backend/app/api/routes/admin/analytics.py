"""Admin analytics routes."""
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_admin_user
from app.models.user import User
from app.schemas.analytics import OverviewStats, RecentActivityItem
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
    "/admin/analytics/recent-activity",
    response_model=List[RecentActivityItem],
    summary="Most recently placed orders and bookings (admin only)",
)
def get_recent_activity(
    limit: int = Query(8, ge=1, le=50, description="Maximum items to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Orders and bookings merged into one feed, newest first by when they were
    placed. Powers the dashboard's "Recent Activity" panel, which previously
    rendered hardcoded placeholder entries.
    """
    return analytics_service.get_recent_activity(db, limit=limit)


# The sales, products and bookings analytics endpoints were removed (Cut List).
# The admin dashboard calls /admin/analytics/overview and nothing else; the
# other three were never requested by any client.
