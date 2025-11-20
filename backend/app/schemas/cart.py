"""Cart schemas for API requests and responses."""
from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, computed_field


class CartItemCreate(BaseModel):
    """Schema for adding item to cart."""

    product_id: UUID = Field(..., alias="productId")
    product_variant_id: Optional[UUID] = Field(None, alias="productVariantId")
    quantity: int = Field(..., gt=0, description="Quantity (must be > 0)")

    model_config = {"populate_by_name": True}


class CartItemUpdate(BaseModel):
    """Schema for updating cart item quantity."""

    quantity: int = Field(..., gt=0, description="New quantity (must be > 0)")


class ProductSummary(BaseModel):
    """Minimal product info for cart item."""

    id: UUID
    title: str
    slug: str
    base_price: Decimal = Field(..., alias="basePrice")
    inventory_count: int = Field(..., alias="inventoryCount")
    is_active: bool = Field(..., alias="isActive")

    model_config = {"from_attributes": True, "populate_by_name": True}


class ProductVariantSummary(BaseModel):
    """Minimal variant info for cart item."""

    id: UUID
    variant_name: str = Field(..., alias="variantName")
    price_adjustment: Decimal = Field(..., alias="priceAdjustment")
    stock_quantity: int = Field(..., alias="stockQuantity")

    model_config = {"from_attributes": True, "populate_by_name": True}


class CartItemResponse(BaseModel):
    """Schema for cart item response."""

    id: UUID
    cart_id: UUID = Field(..., alias="cartId")
    product_id: UUID = Field(..., alias="productId")
    product_variant_id: Optional[UUID] = Field(None, alias="productVariantId")
    quantity: int
    created_at: datetime = Field(..., alias="createdAt")
    updated_at: datetime = Field(..., alias="updatedAt")
    product: ProductSummary
    product_variant: Optional[ProductVariantSummary] = Field(None, alias="productVariant")

    @computed_field
    @property
    def unit_price(self) -> Decimal:
        """Calculate unit price (base price + variant adjustment if applicable)."""
        price = self.product.base_price
        if self.product_variant:
            price += self.product_variant.price_adjustment
        return price

    @computed_field
    @property
    def subtotal(self) -> Decimal:
        """Calculate item subtotal (unit price × quantity)."""
        return self.unit_price * Decimal(str(self.quantity))

    @computed_field
    @property
    def is_available(self) -> bool:
        """Check if item is available for purchase."""
        # Check product is active
        if not self.product.is_active:
            return False

        # Check stock availability
        if self.product_variant:
            return self.product_variant.stock_quantity >= self.quantity
        else:
            return self.product.inventory_count >= self.quantity

    model_config = {"from_attributes": True, "populate_by_name": True}


class CartResponse(BaseModel):
    """Schema for cart response."""

    id: UUID
    user_id: UUID = Field(..., alias="userId")
    items: list[CartItemResponse]
    created_at: datetime = Field(..., alias="createdAt")
    updated_at: datetime = Field(..., alias="updatedAt")

    @computed_field
    @property
    def total_items(self) -> int:
        """Total number of items in cart."""
        return sum(item.quantity for item in self.items)

    @computed_field
    @property
    def total_amount(self) -> Decimal:
        """Total cart amount (sum of all item subtotals)."""
        return sum(item.subtotal for item in self.items)

    @computed_field
    @property
    def has_unavailable_items(self) -> bool:
        """Check if cart contains any unavailable items."""
        return any(not item.is_available for item in self.items)

    model_config = {"from_attributes": True, "populate_by_name": True}
