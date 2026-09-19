"""
FastAPI dependencies for authentication and authorization
"""

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID

from app.core.database import get_db
from app.core.security import verify_token
from app.models.user import User


class HTTPBearerUnauthorized(HTTPBearer):
    """Custom HTTPBearer that raises 401 instead of 403 for missing credentials."""

    async def __call__(self, request: Request) -> Optional[HTTPAuthorizationCredentials]:
        try:
            return await super().__call__(request)
        except HTTPException as e:
            if e.status_code == 403:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Not authenticated",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            raise


# Security scheme for Bearer token
security = HTTPBearerUnauthorized()
optional_security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency to get the current authenticated user from JWT token

    Args:
        credentials: HTTP Bearer token credentials
        db: Database session

    Returns:
        Current user object

    Raises:
        HTTPException: If token is invalid or user not found
    """
    token = credentials.credentials

    # Verify token
    payload = verify_token(token, token_type="access")
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get user ID from token
    user_id: Optional[str] = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get user from database
    try:
        user = db.query(User).filter(User.id == UUID(user_id)).first()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )

    return user


async def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(optional_security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Dependency to optionally get the current authenticated user from JWT token

    Returns None if no token is provided or token is invalid.
    Does not raise HTTPException for missing/invalid tokens.

    Args:
        credentials: Optional HTTP Bearer token credentials
        db: Database session

    Returns:
        Current user object or None
    """
    if not credentials:
        return None

    token = credentials.credentials

    # Verify token
    payload = verify_token(token, token_type="access")
    if not payload:
        return None

    # Get user ID from token
    user_id: Optional[str] = payload.get("sub")
    if not user_id:
        return None

    # Get user from database
    try:
        user = db.query(User).filter(User.id == UUID(user_id)).first()
    except ValueError:
        return None

    if not user or not user.is_active:
        return None

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency to ensure user is active

    Args:
        current_user: Current authenticated user

    Returns:
        Active user object

    Raises:
        HTTPException: If user is not active
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    return current_user


async def get_current_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency to ensure user is an admin

    Args:
        current_user: Current authenticated user

    Returns:
        Admin user object

    Raises:
        HTTPException: If user is not an admin
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user


async def get_current_super_admin(
    current_user: User = Depends(get_current_admin_user)
) -> User:
    """
    Dependency to ensure user is a super admin

    Args:
        current_user: Current admin user

    Returns:
        Super admin user object

    Raises:
        HTTPException: If user is not a super admin
    """
    if current_user.admin_role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required"
        )
    return current_user


# The granular admin roles (product_manager, booking_manager, content_editor,
# artist) were declared but never enforced: no router depended on their guards,
# so every admin had full access regardless of the role assigned to them. The
# guards and the require_role factory are gone rather than wired up — the
# business is one artist plus occasional help, and a role UI that implies a
# restriction it doesn't apply is worse than no roles at all.
#
# What remains is the distinction that is actually enforced: admin, and
# super_admin for user and storage management (see get_current_super_admin).
