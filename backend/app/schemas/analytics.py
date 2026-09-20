"""Analytics schemas for API responses."""
from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, Field


class OverviewStats(BaseModel):
    """Overview statistics for admin dashboard."""

    total_revenue: Decimal = Field(..., alias="totalRevenue")
    total_orders: int = Field(..., alias="totalOrders")
    total_bookings: int = Field(..., alias="totalBookings")
    total_products: int = Field(..., alias="totalProducts")
    total_customers: int = Field(..., alias="totalCustomers")
    pending_orders: int = Field(..., alias="pendingOrders")
    pending_bookings: int = Field(..., alias="pendingBookings")
    revenue_change_percent: Optional[float] = Field(None, alias="revenueChangePercent")
    orders_change_percent: Optional[float] = Field(None, alias="ordersChangePercent")

    class Config:
        populate_by_name = True
