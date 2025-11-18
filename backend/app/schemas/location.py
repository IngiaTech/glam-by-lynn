"""Transport location schemas for API requests and responses."""
from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class TransportLocationCreate(BaseModel):
    """Schema for creating a transport location."""

    location_name: str = Field(..., min_length=1, max_length=255, alias="locationName")
    county: Optional[str] = Field(None, max_length=100)
    transport_cost: Decimal = Field(default=Decimal("0.00"), ge=0, alias="transportCost")
    is_free: bool = Field(default=False, alias="isFree")
    is_active: bool = Field(default=True, alias="isActive")

    @field_validator("location_name")
    @classmethod
    def validate_location_name(cls, v: str) -> str:
        """Validate and normalize location name."""
        v = v.strip()
        if not v:
            raise ValueError("Location name cannot be empty")
        return v

    class Config:
        populate_by_name = True


class TransportLocationUpdate(BaseModel):
    """Schema for updating a transport location."""

    location_name: Optional[str] = Field(None, min_length=1, max_length=255, alias="locationName")
    county: Optional[str] = Field(None, max_length=100)
    transport_cost: Optional[Decimal] = Field(None, ge=0, alias="transportCost")
    is_free: Optional[bool] = Field(None, alias="isFree")
    is_active: Optional[bool] = Field(None, alias="isActive")

    @field_validator("location_name")
    @classmethod
    def validate_location_name(cls, v: Optional[str]) -> Optional[str]:
        """Validate and normalize location name."""
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Location name cannot be empty")
        return v

    class Config:
        populate_by_name = True


class TransportLocationResponse(BaseModel):
    """Schema for transport location response."""

    id: UUID
    location_name: str = Field(..., alias="locationName")
    county: Optional[str] = None
    transport_cost: Decimal = Field(..., alias="transportCost")
    is_free: bool = Field(..., alias="isFree")
    is_active: bool = Field(..., alias="isActive")
    created_at: datetime = Field(..., alias="createdAt")
    updated_at: datetime = Field(..., alias="updatedAt")

    class Config:
        from_attributes = True
        populate_by_name = True
        json_encoders = {
            Decimal: str
        }
