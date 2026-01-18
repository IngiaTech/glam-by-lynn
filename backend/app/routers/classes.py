"""
Public Makeup Classes API routes
Publicly accessible endpoints for customers to view classes and register interest
"""
import math
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.makeup_class import (
    ClassEnrollmentCreate,
    ClassEnrollmentResponse,
    MakeupClassListResponse,
    MakeupClassResponse,
)
from app.services import makeup_class_service

router = APIRouter(prefix="/classes", tags=["classes"])


@router.get("", response_model=MakeupClassListResponse)
async def list_active_classes(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, alias="pageSize", description="Items per page"),
    skill_level: Optional[str] = Query(
        None,
        alias="skillLevel",
        description="Filter by skill level (beginner, intermediate, advanced)",
    ),
    topic: Optional[str] = Query(
        None,
        description="Filter by topic (bridal, everyday, special_effects, editorial, etc.)",
    ),
    db: Session = Depends(get_db),
):
    """
    Get paginated list of active makeup classes (public endpoint)

    **Publicly accessible - No authentication required**

    Only returns active classes ordered by featured status and display_order.

    Query parameters:
    - **page**: Page number (default: 1)
    - **pageSize**: Items per page (default: 20, max: 100)
    - **skillLevel**: Filter by skill level (beginner, intermediate, advanced)
    - **topic**: Filter by topic

    Returns:
    - Makeup classes with details
    - Pagination metadata
    """
    skip = (page - 1) * page_size

    # Only show active classes to public
    classes, total = makeup_class_service.get_makeup_classes(
        db=db,
        skip=skip,
        limit=page_size,
        skill_level=skill_level,
        topic=topic,
        is_active=True,
    )

    total_pages = max(math.ceil(total / page_size), 1)

    return MakeupClassListResponse(
        items=[MakeupClassResponse.model_validate(c) for c in classes],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{class_id}", response_model=MakeupClassResponse)
async def get_class_details(
    class_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Get a specific makeup class by ID (public endpoint)

    **Publicly accessible - No authentication required**

    Returns:
    - Full class details including pricing, duration, requirements
    - What you'll learn

    Raises:
    - 404: If class not found or is inactive
    """
    makeup_class = makeup_class_service.get_makeup_class_by_id(
        db, class_id, active_only=True
    )

    if not makeup_class:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Makeup class with ID {class_id} not found",
        )

    return MakeupClassResponse.model_validate(makeup_class)


@router.get("/slug/{slug}", response_model=MakeupClassResponse)
async def get_class_by_slug(
    slug: str,
    db: Session = Depends(get_db),
):
    """
    Get a specific makeup class by slug (public endpoint)

    **Publicly accessible - No authentication required**

    Returns:
    - Full class details including pricing, duration, requirements
    - What you'll learn

    Raises:
    - 404: If class not found or is inactive
    """
    makeup_class = makeup_class_service.get_makeup_class_by_slug(
        db, slug, active_only=True
    )

    if not makeup_class:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Makeup class with slug '{slug}' not found",
        )

    return MakeupClassResponse.model_validate(makeup_class)


@router.post(
    "/enroll",
    response_model=ClassEnrollmentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register_interest(
    enrollment_data: ClassEnrollmentCreate,
    db: Session = Depends(get_db),
):
    """
    Register interest in a makeup class (public endpoint)

    **Publicly accessible - No authentication required**

    This creates an enrollment request with status 'pending'.
    Admin will contact the student to confirm dates and finalize details.

    Required fields:
    - **classId**: ID of the makeup class
    - **fullName**: Student's full name
    - **email**: Student's email address
    - **phone**: Student's phone number

    Optional fields:
    - **preferredDates**: Array of preferred date strings
    - **message**: Additional message or questions

    Returns:
    - Created enrollment with enrollment number
    """
    try:
        enrollment = makeup_class_service.create_enrollment(
            db=db,
            data=enrollment_data,
            user_id=None,  # Public registration (guest)
        )

        return ClassEnrollmentResponse.model_validate(enrollment)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get(
    "/enrollment/{enrollment_number}",
    response_model=ClassEnrollmentResponse,
)
async def get_enrollment_status(
    enrollment_number: str,
    db: Session = Depends(get_db),
):
    """
    Get enrollment status by enrollment number (public endpoint)

    **Publicly accessible - No authentication required**

    Allows students to check their enrollment status using their enrollment number.

    Returns:
    - Enrollment details including status
    - Associated class information

    Raises:
    - 404: If enrollment not found
    """
    enrollment = makeup_class_service.get_enrollment_by_number(
        db, enrollment_number, include_class=True
    )

    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Enrollment with number '{enrollment_number}' not found",
        )

    return ClassEnrollmentResponse.model_validate(enrollment)
