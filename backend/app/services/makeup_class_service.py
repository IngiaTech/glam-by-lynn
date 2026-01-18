"""Makeup class service for business logic."""
import csv
import io
import re
from datetime import date as date_type, datetime
from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models.makeup_class import ClassEnrollment, MakeupClass
from app.schemas.makeup_class import (
    ClassEnrollmentCreate,
    MakeupClassCreate,
    MakeupClassUpdate,
)


def generate_slug(title: str) -> str:
    """
    Generate a URL-friendly slug from a title.

    Args:
        title: The title to convert to a slug

    Returns:
        URL-friendly slug
    """
    # Convert to lowercase
    slug = title.lower()
    # Replace spaces and special characters with hyphens
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    # Remove leading/trailing hyphens
    slug = slug.strip("-")
    # Remove consecutive hyphens
    slug = re.sub(r"-+", "-", slug)
    return slug


def ensure_unique_slug(db: Session, slug: str, exclude_id: Optional[UUID] = None) -> str:
    """
    Ensure a slug is unique by appending a number if necessary.

    Args:
        db: Database session
        slug: Base slug
        exclude_id: ID to exclude from uniqueness check (for updates)

    Returns:
        Unique slug
    """
    original_slug = slug
    counter = 1

    while True:
        query = db.query(MakeupClass).filter(MakeupClass.slug == slug)
        if exclude_id:
            query = query.filter(MakeupClass.id != exclude_id)

        if not query.first():
            return slug

        slug = f"{original_slug}-{counter}"
        counter += 1


def generate_enrollment_number(db: Session) -> str:
    """
    Generate a unique enrollment number.

    Format: CE{YYYYMMDD}{####} where #### is a 4-digit counter

    Args:
        db: Database session

    Returns:
        Unique enrollment number
    """
    today = date_type.today()
    date_prefix = f"CE{today.strftime('%Y%m%d')}"

    # Get the count of enrollments created today
    count = (
        db.query(func.count(ClassEnrollment.id))
        .filter(ClassEnrollment.enrollment_number.like(f"{date_prefix}%"))
        .scalar()
        or 0
    )

    # Generate number with padding
    enrollment_number = f"{date_prefix}{(count + 1):04d}"

    # Ensure uniqueness (in case of concurrent requests)
    while (
        db.query(ClassEnrollment)
        .filter(ClassEnrollment.enrollment_number == enrollment_number)
        .first()
    ):
        count += 1
        enrollment_number = f"{date_prefix}{(count + 1):04d}"

    return enrollment_number


# === MakeupClass CRUD Operations ===


def create_makeup_class(db: Session, data: MakeupClassCreate) -> MakeupClass:
    """
    Create a new makeup class.

    Args:
        db: Database session
        data: Class creation data

    Returns:
        Created makeup class
    """
    # Generate unique slug from title
    slug = generate_slug(data.title)
    slug = ensure_unique_slug(db, slug)

    makeup_class = MakeupClass(
        title=data.title,
        slug=slug,
        description=data.description,
        skill_level=data.skill_level,
        topic=data.topic,
        duration_hours=data.duration_hours,
        price_from=data.price_from,
        price_to=data.price_to,
        what_you_learn=data.what_you_learn,
        requirements=data.requirements,
        image_url=data.image_url,
        is_active=data.is_active,
        is_featured=data.is_featured,
        display_order=data.display_order,
    )

    db.add(makeup_class)
    db.commit()
    db.refresh(makeup_class)

    return makeup_class


def get_makeup_class_by_id(
    db: Session, class_id: UUID, active_only: bool = False
) -> Optional[MakeupClass]:
    """
    Get a makeup class by ID.

    Args:
        db: Database session
        class_id: Class ID
        active_only: Only return if class is active

    Returns:
        MakeupClass or None
    """
    query = db.query(MakeupClass).filter(MakeupClass.id == class_id)

    if active_only:
        query = query.filter(MakeupClass.is_active == True)

    return query.first()


def get_makeup_class_by_slug(
    db: Session, slug: str, active_only: bool = False
) -> Optional[MakeupClass]:
    """
    Get a makeup class by slug.

    Args:
        db: Database session
        slug: Class slug
        active_only: Only return if class is active

    Returns:
        MakeupClass or None
    """
    query = db.query(MakeupClass).filter(MakeupClass.slug == slug)

    if active_only:
        query = query.filter(MakeupClass.is_active == True)

    return query.first()


def get_makeup_classes(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    skill_level: Optional[str] = None,
    topic: Optional[str] = None,
    is_active: Optional[bool] = None,
    is_featured: Optional[bool] = None,
) -> Tuple[List[MakeupClass], int]:
    """
    Get makeup classes with pagination and filters.

    Args:
        db: Database session
        skip: Number of records to skip
        limit: Maximum number of records to return
        skill_level: Filter by skill level
        topic: Filter by topic
        is_active: Filter by active status
        is_featured: Filter by featured status

    Returns:
        Tuple of (classes list, total count)
    """
    query = db.query(MakeupClass)

    # Apply filters
    if skill_level:
        query = query.filter(MakeupClass.skill_level == skill_level)

    if topic:
        query = query.filter(MakeupClass.topic == topic)

    if is_active is not None:
        query = query.filter(MakeupClass.is_active == is_active)

    if is_featured is not None:
        query = query.filter(MakeupClass.is_featured == is_featured)

    # Get total count
    total = query.count()

    # Order by featured status, display order, and creation date
    query = query.order_by(
        MakeupClass.is_featured.desc(),
        MakeupClass.display_order.asc(),
        MakeupClass.created_at.desc(),
    )

    # Apply pagination
    classes = query.offset(skip).limit(limit).all()

    return classes, total


def update_makeup_class(
    db: Session, class_id: UUID, data: MakeupClassUpdate
) -> Optional[MakeupClass]:
    """
    Update a makeup class.

    Args:
        db: Database session
        class_id: Class ID
        data: Update data

    Returns:
        Updated MakeupClass or None if not found
    """
    makeup_class = db.query(MakeupClass).filter(MakeupClass.id == class_id).first()

    if not makeup_class:
        return None

    # Update fields if provided
    update_data = data.model_dump(exclude_unset=True)

    # Handle title change - update slug
    if "title" in update_data and update_data["title"] != makeup_class.title:
        new_slug = generate_slug(update_data["title"])
        makeup_class.slug = ensure_unique_slug(db, new_slug, exclude_id=class_id)

    for field, value in update_data.items():
        if field != "title":  # title handled above
            setattr(makeup_class, field, value)
        else:
            makeup_class.title = value

    db.commit()
    db.refresh(makeup_class)

    return makeup_class


def delete_makeup_class(db: Session, class_id: UUID) -> bool:
    """
    Delete a makeup class.

    Args:
        db: Database session
        class_id: Class ID

    Returns:
        True if deleted, False if not found
    """
    makeup_class = db.query(MakeupClass).filter(MakeupClass.id == class_id).first()

    if not makeup_class:
        return False

    db.delete(makeup_class)
    db.commit()

    return True


# === ClassEnrollment CRUD Operations ===


def create_enrollment(
    db: Session, data: ClassEnrollmentCreate, user_id: Optional[UUID] = None
) -> ClassEnrollment:
    """
    Create a new class enrollment (interest registration).

    Args:
        db: Database session
        data: Enrollment creation data
        user_id: Optional user ID for authenticated users

    Returns:
        Created enrollment

    Raises:
        ValueError: If class not found or not active
    """
    # Verify class exists and is active
    makeup_class = (
        db.query(MakeupClass)
        .filter(MakeupClass.id == data.class_id, MakeupClass.is_active == True)
        .first()
    )

    if not makeup_class:
        raise ValueError(f"Makeup class with ID {data.class_id} not found or not active")

    # Generate unique enrollment number
    enrollment_number = generate_enrollment_number(db)

    enrollment = ClassEnrollment(
        enrollment_number=enrollment_number,
        class_id=data.class_id,
        user_id=user_id,
        full_name=data.full_name,
        email=data.email,
        phone=data.phone,
        preferred_dates=data.preferred_dates,
        message=data.message,
        status="pending",
    )

    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)

    return enrollment


def get_enrollment_by_id(
    db: Session, enrollment_id: UUID, include_class: bool = False
) -> Optional[ClassEnrollment]:
    """
    Get an enrollment by ID.

    Args:
        db: Database session
        enrollment_id: Enrollment ID
        include_class: Include makeup class details

    Returns:
        ClassEnrollment or None
    """
    query = db.query(ClassEnrollment).filter(ClassEnrollment.id == enrollment_id)

    if include_class:
        query = query.options(joinedload(ClassEnrollment.makeup_class))

    return query.first()


def get_enrollment_by_number(
    db: Session, enrollment_number: str, include_class: bool = False
) -> Optional[ClassEnrollment]:
    """
    Get an enrollment by enrollment number.

    Args:
        db: Database session
        enrollment_number: Enrollment number
        include_class: Include makeup class details

    Returns:
        ClassEnrollment or None
    """
    query = db.query(ClassEnrollment).filter(
        ClassEnrollment.enrollment_number == enrollment_number
    )

    if include_class:
        query = query.options(joinedload(ClassEnrollment.makeup_class))

    return query.first()


def get_enrollments(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    class_id: Optional[UUID] = None,
    status: Optional[str] = None,
    email: Optional[str] = None,
    include_class: bool = False,
) -> Tuple[List[ClassEnrollment], int]:
    """
    Get enrollments with pagination and filters.

    Args:
        db: Database session
        skip: Number of records to skip
        limit: Maximum number of records to return
        class_id: Filter by class ID
        status: Filter by status
        email: Filter by email
        include_class: Include makeup class details

    Returns:
        Tuple of (enrollments list, total count)
    """
    query = db.query(ClassEnrollment)

    if include_class:
        query = query.options(joinedload(ClassEnrollment.makeup_class))

    # Apply filters
    if class_id:
        query = query.filter(ClassEnrollment.class_id == class_id)

    if status:
        query = query.filter(ClassEnrollment.status == status)

    if email:
        query = query.filter(ClassEnrollment.email.ilike(f"%{email}%"))

    # Get total count (need to count before joining for accurate count)
    total = (
        db.query(func.count(ClassEnrollment.id))
        .filter(
            *[
                f
                for f in [
                    ClassEnrollment.class_id == class_id if class_id else None,
                    ClassEnrollment.status == status if status else None,
                    ClassEnrollment.email.ilike(f"%{email}%") if email else None,
                ]
                if f is not None
            ]
        )
        .scalar()
    )

    # Order by creation date (newest first)
    query = query.order_by(ClassEnrollment.created_at.desc())

    # Apply pagination
    enrollments = query.offset(skip).limit(limit).all()

    return enrollments, total


def update_enrollment_status(
    db: Session,
    enrollment_id: UUID,
    status: str,
    admin_notes: Optional[str] = None,
) -> Optional[ClassEnrollment]:
    """
    Update enrollment status (admin only).

    Args:
        db: Database session
        enrollment_id: Enrollment ID
        status: New status
        admin_notes: Optional admin notes

    Returns:
        Updated enrollment or None if not found
    """
    enrollment = (
        db.query(ClassEnrollment).filter(ClassEnrollment.id == enrollment_id).first()
    )

    if not enrollment:
        return None

    old_status = enrollment.status
    enrollment.status = status

    # Add note about status change
    existing_notes = enrollment.admin_notes or ""
    note = f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M')}] Status changed from '{old_status}' to '{status}'"
    if admin_notes:
        note += f": {admin_notes}"
        enrollment.admin_notes = existing_notes + note
    elif old_status != status:
        enrollment.admin_notes = existing_notes + note

    db.commit()
    db.refresh(enrollment)

    return enrollment


def delete_enrollment(db: Session, enrollment_id: UUID) -> bool:
    """
    Delete an enrollment.

    Args:
        db: Database session
        enrollment_id: Enrollment ID

    Returns:
        True if deleted, False if not found
    """
    enrollment = (
        db.query(ClassEnrollment).filter(ClassEnrollment.id == enrollment_id).first()
    )

    if not enrollment:
        return False

    db.delete(enrollment)
    db.commit()

    return True


def export_enrollments_csv(
    db: Session,
    class_id: Optional[UUID] = None,
    status: Optional[str] = None,
) -> str:
    """
    Export enrollments to CSV format.

    Args:
        db: Database session
        class_id: Filter by class ID
        status: Filter by status

    Returns:
        CSV string
    """
    # Get enrollments with class details
    enrollments, _ = get_enrollments(
        db,
        skip=0,
        limit=10000,  # High limit for export
        class_id=class_id,
        status=status,
        include_class=True,
    )

    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)

    # Write header
    writer.writerow(
        [
            "Enrollment Number",
            "Class Title",
            "Skill Level",
            "Topic",
            "Full Name",
            "Email",
            "Phone",
            "Preferred Dates",
            "Message",
            "Status",
            "Created At",
        ]
    )

    # Write data
    for enrollment in enrollments:
        class_title = enrollment.makeup_class.title if enrollment.makeup_class else "N/A"
        skill_level = (
            enrollment.makeup_class.skill_level if enrollment.makeup_class else "N/A"
        )
        topic = enrollment.makeup_class.topic if enrollment.makeup_class else "N/A"
        preferred_dates = ", ".join(enrollment.preferred_dates or [])

        writer.writerow(
            [
                enrollment.enrollment_number,
                class_title,
                skill_level,
                topic,
                enrollment.full_name,
                enrollment.email,
                enrollment.phone,
                preferred_dates,
                enrollment.message or "",
                enrollment.status,
                enrollment.created_at.strftime("%Y-%m-%d %H:%M"),
            ]
        )

    return output.getvalue()


def get_enrollment_stats(db: Session, class_id: Optional[UUID] = None) -> dict:
    """
    Get enrollment statistics.

    Args:
        db: Database session
        class_id: Optional filter by class ID

    Returns:
        Dictionary with enrollment statistics
    """
    query = db.query(ClassEnrollment)

    if class_id:
        query = query.filter(ClassEnrollment.class_id == class_id)

    # Count by status
    status_counts = {}
    for status in ["pending", "contacted", "confirmed", "completed", "cancelled"]:
        count = query.filter(ClassEnrollment.status == status).count()
        status_counts[status] = count

    total = query.count()

    return {
        "total": total,
        "by_status": status_counts,
    }
