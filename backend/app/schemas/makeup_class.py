"""Makeup class schemas for API requests and responses."""
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator


# === Enum-like constants ===
SKILL_LEVELS = ["beginner", "intermediate", "advanced"]
CLASS_TOPICS = [
    "bridal",
    "everyday",
    "special_effects",
    "editorial",
    "corrective",
    "stage_theater",
    "airbrush",
    "contouring",
    "eye_makeup",
    "other",
]
ENROLLMENT_STATUSES = ["pending", "contacted", "confirmed", "completed", "cancelled"]


# === MakeupClass Schemas ===


class MakeupClassBase(BaseModel):
    """Base schema for makeup class."""

    title: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None
    skill_level: str = Field(..., alias="skillLevel")
    topic: str
    duration_days: float = Field(..., gt=0, alias="durationDays")
    price_from: Optional[float] = Field(None, ge=0, alias="priceFrom")
    price_to: Optional[float] = Field(None, ge=0, alias="priceTo")
    what_you_learn: Optional[list[str]] = Field(None, alias="whatYouLearn")
    requirements: Optional[list[str]] = None
    image_url: Optional[str] = Field(None, alias="imageUrl")

    @field_validator("skill_level")
    @classmethod
    def validate_skill_level(cls, v: str) -> str:
        if v not in SKILL_LEVELS:
            raise ValueError(f"skill_level must be one of: {', '.join(SKILL_LEVELS)}")
        return v

    @field_validator("topic")
    @classmethod
    def validate_topic(cls, v: str) -> str:
        if v not in CLASS_TOPICS:
            raise ValueError(f"topic must be one of: {', '.join(CLASS_TOPICS)}")
        return v

    model_config = {"populate_by_name": True}


class MakeupClassCreate(MakeupClassBase):
    """Schema for creating a makeup class."""

    is_active: bool = Field(default=True, alias="isActive")
    is_featured: bool = Field(default=False, alias="isFeatured")
    display_order: int = Field(default=0, alias="displayOrder")


class MakeupClassUpdate(BaseModel):
    """Schema for updating a makeup class."""

    title: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = None
    skill_level: Optional[str] = Field(None, alias="skillLevel")
    topic: Optional[str] = None
    duration_days: Optional[float] = Field(None, gt=0, alias="durationDays")
    price_from: Optional[float] = Field(None, ge=0, alias="priceFrom")
    price_to: Optional[float] = Field(None, ge=0, alias="priceTo")
    what_you_learn: Optional[list[str]] = Field(None, alias="whatYouLearn")
    requirements: Optional[list[str]] = None
    image_url: Optional[str] = Field(None, alias="imageUrl")
    is_active: Optional[bool] = Field(None, alias="isActive")
    is_featured: Optional[bool] = Field(None, alias="isFeatured")
    display_order: Optional[int] = Field(None, alias="displayOrder")

    @field_validator("skill_level")
    @classmethod
    def validate_skill_level(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in SKILL_LEVELS:
            raise ValueError(f"skill_level must be one of: {', '.join(SKILL_LEVELS)}")
        return v

    @field_validator("topic")
    @classmethod
    def validate_topic(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in CLASS_TOPICS:
            raise ValueError(f"topic must be one of: {', '.join(CLASS_TOPICS)}")
        return v

    model_config = {"populate_by_name": True}


class MakeupClassResponse(BaseModel):
    """Schema for makeup class response."""

    id: UUID
    title: str
    slug: str
    description: Optional[str] = None
    skill_level: str = Field(..., alias="skillLevel")
    topic: str
    duration_days: float = Field(..., alias="durationDays")
    price_from: Optional[float] = Field(None, alias="priceFrom")
    price_to: Optional[float] = Field(None, alias="priceTo")
    what_you_learn: Optional[list[str]] = Field(None, alias="whatYouLearn")
    requirements: Optional[list[str]] = None
    image_url: Optional[str] = Field(None, alias="imageUrl")
    is_active: bool = Field(..., alias="isActive")
    is_featured: bool = Field(..., alias="isFeatured")
    display_order: int = Field(..., alias="displayOrder")
    created_at: datetime = Field(..., alias="createdAt")
    updated_at: datetime = Field(..., alias="updatedAt")

    model_config = {"from_attributes": True, "populate_by_name": True}


class MakeupClassListResponse(BaseModel):
    """Response for paginated makeup class list."""

    items: list[MakeupClassResponse]
    total: int
    page: int
    page_size: int = Field(..., alias="pageSize")
    total_pages: int = Field(..., alias="totalPages")

    model_config = {"populate_by_name": True}


# === ClassEnrollment Schemas ===


class ClassEnrollmentCreate(BaseModel):
    """Schema for creating a class enrollment (interest registration)."""

    class_id: UUID = Field(..., alias="classId")
    full_name: str = Field(..., min_length=2, max_length=255, alias="fullName")
    email: EmailStr
    phone: str = Field(..., min_length=10, max_length=20)
    preferred_dates: Optional[list[str]] = Field(None, alias="preferredDates")
    message: Optional[str] = Field(None, max_length=2000)

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Full name cannot be empty")
        return v

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        cleaned = v.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
        if not cleaned.replace("+", "").isdigit():
            raise ValueError(
                "Phone number must contain only digits and optional + prefix"
            )
        return v

    model_config = {"populate_by_name": True}


class ClassEnrollmentStatusUpdate(BaseModel):
    """Schema for updating enrollment status (admin)."""

    status: str
    admin_notes: Optional[str] = Field(None, alias="adminNotes")

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in ENROLLMENT_STATUSES:
            raise ValueError(
                f"status must be one of: {', '.join(ENROLLMENT_STATUSES)}"
            )
        return v

    model_config = {"populate_by_name": True}


class ClassEnrollmentResponse(BaseModel):
    """Schema for class enrollment response."""

    id: UUID
    enrollment_number: str = Field(..., alias="enrollmentNumber")
    class_id: UUID = Field(..., alias="classId")
    user_id: Optional[UUID] = Field(None, alias="userId")
    full_name: str = Field(..., alias="fullName")
    email: str
    phone: str
    preferred_dates: Optional[list[str]] = Field(None, alias="preferredDates")
    message: Optional[str] = None
    status: str
    admin_notes: Optional[str] = Field(None, alias="adminNotes")
    created_at: datetime = Field(..., alias="createdAt")
    updated_at: datetime = Field(..., alias="updatedAt")
    makeup_class: Optional[MakeupClassResponse] = Field(None, alias="makeupClass")

    model_config = {"from_attributes": True, "populate_by_name": True}


class ClassEnrollmentListResponse(BaseModel):
    """Response for paginated enrollment list."""

    items: list[ClassEnrollmentResponse]
    total: int
    page: int
    page_size: int = Field(..., alias="pageSize")
    total_pages: int = Field(..., alias="totalPages")

    model_config = {"populate_by_name": True}
