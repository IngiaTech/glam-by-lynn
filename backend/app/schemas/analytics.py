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


class SalesDataPoint(BaseModel):
    """Single data point for sales chart."""

    date: str
    revenue: Decimal
    orders: int = Field(..., alias="orderCount")

    class Config:
        populate_by_name = True


class SalesAnalytics(BaseModel):
    """Sales analytics with time series data."""

    total_revenue: Decimal = Field(..., alias="totalRevenue")
    total_orders: int = Field(..., alias="totalOrders")
    average_order_value: Decimal = Field(..., alias="averageOrderValue")
    data_points: List[SalesDataPoint] = Field(..., alias="dataPoints")

    class Config:
        populate_by_name = True


class ProductPerformance(BaseModel):
    """Product performance metrics."""

    product_id: str = Field(..., alias="productId")
    product_name: str = Field(..., alias="productName")
    total_sold: int = Field(..., alias="totalSold")
    total_revenue: Decimal = Field(..., alias="totalRevenue")
    stock_quantity: int = Field(..., alias="stockQuantity")

    class Config:
        populate_by_name = True


class ProductAnalytics(BaseModel):
    """Product analytics response."""

    top_products: List[ProductPerformance] = Field(..., alias="topProducts")
    total_products: int = Field(..., alias="totalProducts")
    low_stock_count: int = Field(..., alias="lowStockCount")

    class Config:
        populate_by_name = True


class BookingDataPoint(BaseModel):
    """Single data point for booking chart."""

    date: str
    bookings: int = Field(..., alias="bookingCount")
    revenue: Decimal

    class Config:
        populate_by_name = True


class ServicePerformance(BaseModel):
    """Service booking performance."""

    service_id: str = Field(..., alias="serviceId")
    service_name: str = Field(..., alias="serviceName")
    total_bookings: int = Field(..., alias="totalBookings")
    total_revenue: Decimal = Field(..., alias="totalRevenue")

    class Config:
        populate_by_name = True


class BookingAnalytics(BaseModel):
    """Booking analytics response."""

    total_bookings: int = Field(..., alias="totalBookings")
    total_revenue: Decimal = Field(..., alias="totalRevenue")
    pending_bookings: int = Field(..., alias="pendingBookings")
    confirmed_bookings: int = Field(..., alias="confirmedBookings")
    completed_bookings: int = Field(..., alias="completedBookings")
    cancelled_bookings: int = Field(..., alias="cancelledBookings")
    data_points: List[BookingDataPoint] = Field(..., alias="dataPoints")
    top_services: List[ServicePerformance] = Field(..., alias="topServices")

    class Config:
        populate_by_name = True
