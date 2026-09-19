"""Admin order schemas for management endpoints."""
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, Field

from app.schemas.order import OrderResponse


class AdminOrderStatusUpdate(BaseModel):
    """Schema for moving an order to a new status."""

    status: str = Field(
        ...,
        description="Order status",
        pattern="^(pending|payment_confirmed|processing|shipped|delivered|cancelled)$",
    )
    admin_notes: Optional[str] = Field(
        None, alias="adminNotes", description="Note recorded with the status change"
    )

    class Config:
        populate_by_name = True


class AdminOrderDeliveryUpdate(BaseModel):
    """Schema for setting the delivery fee agreed with the customer."""

    delivery_fee: Decimal = Field(
        ..., alias="deliveryFee", ge=0, description="Agreed delivery fee"
    )
    admin_notes: Optional[str] = Field(
        None, alias="adminNotes", description="Note recorded with the change"
    )

    class Config:
        populate_by_name = True


class AdminOrderUpdate(BaseModel):
    """Schema for updating an order's fulfilment details."""

    tracking_number: Optional[str] = Field(
        None, alias="trackingNumber", max_length=100, description="Courier tracking reference"
    )
    payment_confirmed: Optional[bool] = Field(
        None, alias="paymentConfirmed", description="Whether payment has been received"
    )
    admin_notes: Optional[str] = Field(
        None, alias="adminNotes", description="Note recorded with the change"
    )

    class Config:
        populate_by_name = True


class AdminOrderResponse(OrderResponse):
    """Order as the admin sees it — adds the internal-only fields."""

    tracking_number: Optional[str] = Field(None, alias="trackingNumber")
    admin_notes: Optional[str] = Field(None, alias="adminNotes")

    class Config:
        populate_by_name = True
        from_attributes = True


class AdminOrderListResponse(BaseModel):
    """Response for a paginated admin order list."""

    orders: List[AdminOrderResponse]
    total: int
    skip: int
    limit: int

    class Config:
        populate_by_name = True
