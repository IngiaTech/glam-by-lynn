"""Admin makeup class management routes."""
import math
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_admin_user
from app.models.user import User
from app.schemas.makeup_class import (
    ClassEnrollmentListResponse,
    ClassEnrollmentResponse,
    ClassEnrollmentStatusUpdate,
    MakeupClassCreate,
    MakeupClassListResponse,
    MakeupClassResponse,
    MakeupClassUpdate,
)
from app.services import makeup_class_service

router = APIRouter(tags=["Admin Classes"])


# === MakeupClass Admin Routes ===


@router.get(
    "/admin/classes",
    response_model=MakeupClassListResponse,
    summary="List all makeup classes (admin only)",
)
def list_all_classes(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, alias="pageSize", description="Items per page"),
    skill_level: Optional[str] = Query(
        None,
        alias="skillLevel",
        description="Filter by skill level",
    ),
    topic: Optional[str] = Query(None, description="Filter by topic"),
    is_active: Optional[bool] = Query(None, alias="isActive", description="Filter by active status"),
    is_featured: Optional[bool] = Query(None, alias="isFeatured", description="Filter by featured status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Get all makeup classes (including inactive).

    Admin only. Supports pagination and filtering.
    """
    skip = (page - 1) * page_size

    classes, total = makeup_class_service.get_makeup_classes(
        db=db,
        skip=skip,
        limit=page_size,
        skill_level=skill_level,
        topic=topic,
        is_active=is_active,
        is_featured=is_featured,
    )

    total_pages = max(math.ceil(total / page_size), 1)

    return MakeupClassListResponse(
        items=[MakeupClassResponse.model_validate(c) for c in classes],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get(
    "/admin/classes/{class_id}",
    response_model=MakeupClassResponse,
    summary="Get makeup class by ID (admin only)",
)
def get_class(
    class_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Get a single makeup class by ID (includes inactive).

    Admin only.
    """
    makeup_class = makeup_class_service.get_makeup_class_by_id(db=db, class_id=class_id)
    if not makeup_class:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Makeup class with ID {class_id} not found",
        )

    return MakeupClassResponse.model_validate(makeup_class)


@router.post(
    "/admin/classes",
    response_model=MakeupClassResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create makeup class (admin only)",
)
def create_class(
    class_data: MakeupClassCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Create a new makeup class.

    Admin only. Requires title, skill level, topic, and duration.
    """
    makeup_class = makeup_class_service.create_makeup_class(
        db=db,
        data=class_data,
    )

    return MakeupClassResponse.model_validate(makeup_class)


@router.put(
    "/admin/classes/{class_id}",
    response_model=MakeupClassResponse,
    summary="Update makeup class (admin only)",
)
def update_class(
    class_id: UUID,
    class_data: MakeupClassUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Update a makeup class.

    Admin only. All fields are optional for partial updates.
    """
    makeup_class = makeup_class_service.update_makeup_class(
        db=db,
        class_id=class_id,
        data=class_data,
    )

    if not makeup_class:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Makeup class with ID {class_id} not found",
        )

    return MakeupClassResponse.model_validate(makeup_class)


@router.delete(
    "/admin/classes/{class_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete makeup class (admin only)",
)
def delete_class(
    class_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Delete a makeup class.

    Admin only. This will also delete all associated enrollments.
    """
    success = makeup_class_service.delete_makeup_class(db=db, class_id=class_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Makeup class with ID {class_id} not found",
        )

    return None


# === ClassEnrollment Admin Routes ===


@router.get(
    "/admin/classes/enrollments/all",
    response_model=ClassEnrollmentListResponse,
    summary="List all enrollments (admin only)",
)
def list_all_enrollments(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, alias="pageSize", description="Items per page"),
    class_id: Optional[UUID] = Query(None, alias="classId", description="Filter by class ID"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    email: Optional[str] = Query(None, description="Filter by email (partial match)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Get all class enrollments with filters.

    Admin only. Supports pagination and filtering by class, status, and email.
    """
    skip = (page - 1) * page_size

    enrollments, total = makeup_class_service.get_enrollments(
        db=db,
        skip=skip,
        limit=page_size,
        class_id=class_id,
        status=status_filter,
        email=email,
        include_class=True,
    )

    total_pages = max(math.ceil(total / page_size), 1)

    return ClassEnrollmentListResponse(
        items=[ClassEnrollmentResponse.model_validate(e) for e in enrollments],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get(
    "/admin/classes/enrollments/stats",
    summary="Get enrollment statistics (admin only)",
)
def get_enrollment_stats(
    class_id: Optional[UUID] = Query(None, alias="classId", description="Filter by class ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Get enrollment statistics.

    Admin only. Returns counts by status.
    """
    stats = makeup_class_service.get_enrollment_stats(db=db, class_id=class_id)
    return stats


@router.get(
    "/admin/classes/enrollments/export/csv",
    summary="Export enrollments to CSV (admin only)",
)
def export_enrollments_csv(
    class_id: Optional[UUID] = Query(None, alias="classId", description="Filter by class ID"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Export enrollments to CSV format.

    Admin only. Returns CSV file with enrollment data.
    """
    csv_content = makeup_class_service.export_enrollments_csv(
        db=db,
        class_id=class_id,
        status=status_filter,
    )

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=enrollments.csv"},
    )


@router.get(
    "/admin/classes/enrollments/{enrollment_id}",
    response_model=ClassEnrollmentResponse,
    summary="Get enrollment by ID (admin only)",
)
def get_enrollment(
    enrollment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Get a single enrollment by ID.

    Admin only.
    """
    enrollment = makeup_class_service.get_enrollment_by_id(
        db=db, enrollment_id=enrollment_id, include_class=True
    )
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Enrollment with ID {enrollment_id} not found",
        )

    return ClassEnrollmentResponse.model_validate(enrollment)


@router.put(
    "/admin/classes/enrollments/{enrollment_id}/status",
    response_model=ClassEnrollmentResponse,
    summary="Update enrollment status (admin only)",
)
def update_enrollment_status(
    enrollment_id: UUID,
    status_data: ClassEnrollmentStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Update enrollment status.

    Admin only. Updates status and optionally adds admin notes.

    Valid statuses: pending, contacted, confirmed, completed, cancelled
    """
    enrollment = makeup_class_service.update_enrollment_status(
        db=db,
        enrollment_id=enrollment_id,
        status=status_data.status,
        admin_notes=status_data.admin_notes,
    )

    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Enrollment with ID {enrollment_id} not found",
        )

    return ClassEnrollmentResponse.model_validate(enrollment)


@router.delete(
    "/admin/classes/enrollments/{enrollment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete enrollment (admin only)",
)
def delete_enrollment(
    enrollment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Delete an enrollment.

    Admin only.
    """
    success = makeup_class_service.delete_enrollment(db=db, enrollment_id=enrollment_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Enrollment with ID {enrollment_id} not found",
        )

    return None
