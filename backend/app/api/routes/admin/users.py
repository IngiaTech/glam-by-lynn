"""Admin user management routes."""
import math
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_super_admin
from app.models.user import User

router = APIRouter(prefix="/admin/users", tags=["admin", "users"])


# Schemas
class AdminRoleUpdate(BaseModel):
    """Schema for updating user admin role."""

    admin_role: str
    is_admin: bool = True

    class Config:
        json_schema_extra = {
            "example": {
                "is_admin": True,
                "admin_role": "product_manager"
            }
        }


class UserListResponse(BaseModel):
    """Response schema for user list."""

    id: str
    email: str
    full_name: Optional[str] = None
    is_admin: bool
    admin_role: Optional[str] = None
    is_active: bool
    created_at: str

    class Config:
        from_attributes = True


class PaginatedUserResponse(BaseModel):
    """Paginated user list response."""

    items: list[UserListResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


@router.get("", response_model=PaginatedUserResponse)
async def list_users(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    is_admin: Optional[bool] = Query(None, alias="isAdmin", description="Filter by admin status"),
    search: Optional[str] = Query(None, description="Search by email or name"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_super_admin),
):
    """
    List all users (super admin only).

    Supports pagination and filtering by admin status.
    """
    skip = (page - 1) * page_size
    query = db.query(User)

    # Apply filters
    if is_admin is not None:
        query = query.filter(User.is_admin == is_admin)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (User.email.ilike(search_term)) | (User.full_name.ilike(search_term))
        )

    # Get total count
    total = query.count()

    # Apply pagination and ordering
    users = query.order_by(User.created_at.desc()).offset(skip).limit(page_size).all()

    total_pages = math.ceil(total / page_size) if total > 0 else 1

    return PaginatedUserResponse(
        items=[
            UserListResponse(
                id=str(user.id),
                email=user.email,
                full_name=user.full_name,
                is_admin=user.is_admin,
                admin_role=user.admin_role,
                is_active=user.is_active,
                created_at=user.created_at.isoformat(),
            )
            for user in users
        ],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{user_id}", response_model=UserListResponse)
async def get_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_super_admin),
):
    """
    Get user by ID (super admin only).
    """
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found",
        )

    return UserListResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        is_admin=user.is_admin,
        admin_role=user.admin_role,
        is_active=user.is_active,
        created_at=user.created_at.isoformat(),
    )


@router.put("/{user_id}/role", response_model=UserListResponse)
async def assign_admin_role(
    user_id: UUID,
    role_data: AdminRoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_super_admin),
):
    """
    Assign or update admin role for a user (super admin only).

    Only whitelisted emails can be made admin.
    Super admin can assign any role: super_admin, product_manager, booking_manager, content_editor, artist.
    """
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found",
        )

    # Validate admin role
    valid_roles = ["super_admin", "product_manager", "booking_manager", "content_editor", "artist"]
    if role_data.admin_role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid admin role. Must be one of: {', '.join(valid_roles)}",
        )

    # Check if email is whitelisted (only if making admin)
    if role_data.is_admin and user.email not in settings.ADMIN_EMAILS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Email {user.email} is not whitelisted for admin access. Add to ADMIN_EMAILS in settings.",
        )

    # Prevent super admin from removing their own super admin role
    if user.id == current_user.id and role_data.admin_role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change your own super admin role",
        )

    # Update user
    user.is_admin = role_data.is_admin
    user.admin_role = role_data.admin_role if role_data.is_admin else None

    db.commit()
    db.refresh(user)

    return UserListResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        is_admin=user.is_admin,
        admin_role=user.admin_role,
        is_active=user.is_active,
        created_at=user.created_at.isoformat(),
    )


@router.delete("/{user_id}/admin", response_model=UserListResponse)
async def revoke_admin_access(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_super_admin),
):
    """
    Revoke admin access from a user (super admin only).

    Sets is_admin to False and removes admin_role.
    """
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found",
        )

    # Prevent super admin from revoking their own admin access
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot revoke your own admin access",
        )

    # Revoke admin access
    user.is_admin = False
    user.admin_role = None

    db.commit()
    db.refresh(user)

    return UserListResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        is_admin=user.is_admin,
        admin_role=user.admin_role,
        is_active=user.is_active,
        created_at=user.created_at.isoformat(),
    )


@router.get("/whitelist/check")
async def check_whitelist(
    email: EmailStr = Query(..., description="Email to check"),
    current_user: User = Depends(get_current_super_admin),
):
    """
    Check if an email is whitelisted for admin access (super admin only).
    """
    is_whitelisted = email in settings.ADMIN_EMAILS

    return {
        "email": email,
        "is_whitelisted": is_whitelisted,
        "message": "Email is whitelisted" if is_whitelisted else "Email is not whitelisted. Add to ADMIN_EMAILS environment variable.",
    }
