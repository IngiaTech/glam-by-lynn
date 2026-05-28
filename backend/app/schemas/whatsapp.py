"""Schemas for the WhatsApp link generation endpoint."""
from typing import List, Literal, Optional, Union
from uuid import UUID

from pydantic import BaseModel, Field


class WhatsAppCartItem(BaseModel):
    product_id: UUID
    quantity: int = Field(default=1, ge=1, le=999)


class WhatsAppProductRequest(BaseModel):
    type: Literal["product"]
    product_id: UUID
    quantity: int = Field(default=1, ge=1, le=999)


class WhatsAppServiceRequest(BaseModel):
    type: Literal["service"]
    service_id: UUID
    preferred_date: Optional[str] = Field(default=None, max_length=64)


class WhatsAppCartRequest(BaseModel):
    type: Literal["cart"]
    items: List[WhatsAppCartItem] = Field(default_factory=list, max_length=100)


class WhatsAppGeneralRequest(BaseModel):
    type: Literal["general"]


WhatsAppLinkRequest = Union[
    WhatsAppProductRequest,
    WhatsAppServiceRequest,
    WhatsAppCartRequest,
    WhatsAppGeneralRequest,
]


class WhatsAppLinkResponse(BaseModel):
    url: str
