"""
Product Variant schemas for request/response validation
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field, field_validator


class ProductVariantBase(BaseModel):
    """Base product variant schema"""
    variant_type: str = Field(..., min_length=1, max_length=50, description="Variant type (e.g., 'color', 'size')")
    variant_value: str = Field(..., min_length=1, max_length=100, description="Variant value (e.g., 'red', 'large')")
    price_adjustment: Decimal = Field(Decimal('0'), description="Price adjustment (can be negative)")
    inventory_count: int = Field(0, ge=0, description="Variant-specific inventory count")
    sku: Optional[str] = Field(None, max_length=100, description="Variant-specific SKU")
    is_active: bool = Field(True, description="Whether variant is active")

    @field_validator('variant_type')
    @classmethod
    def validate_variant_type(cls, v: str) -> str:
        """Validate and normalize variant type"""
        v = v.strip().lower()
        if not v:
            raise ValueError('Variant type cannot be empty')
        return v

    @field_validator('variant_value')
    @classmethod
    def validate_variant_value(cls, v: str) -> str:
        """Validate and clean variant value"""
        v = v.strip()
        if not v:
            raise ValueError('Variant value cannot be empty')
        return v


class ProductVariantCreate(ProductVariantBase):
    """Schema for creating a product variant"""
    pass


class ProductVariantUpdate(BaseModel):
    """Schema for updating a product variant"""
    variant_type: Optional[str] = Field(None, min_length=1, max_length=50)
    variant_value: Optional[str] = Field(None, min_length=1, max_length=100)
    price_adjustment: Optional[Decimal] = None
    inventory_count: Optional[int] = Field(None, ge=0)
    sku: Optional[str] = Field(None, max_length=100)
    is_active: Optional[bool] = None

    @field_validator('variant_type')
    @classmethod
    def validate_variant_type(cls, v: Optional[str]) -> Optional[str]:
        """Validate and normalize variant type if provided"""
        if v is not None:
            v = v.strip().lower()
            if not v:
                raise ValueError('Variant type cannot be empty')
        return v

    @field_validator('variant_value')
    @classmethod
    def validate_variant_value(cls, v: Optional[str]) -> Optional[str]:
        """Validate and clean variant value if provided"""
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError('Variant value cannot be empty')
        return v


class ProductVariantResponse(ProductVariantBase):
    """Schema for product variant response"""
    id: UUID
    product_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProductVariantListResponse(BaseModel):
    """Schema for variant list response"""
    items: list[ProductVariantResponse]
    total: int
