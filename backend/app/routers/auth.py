"""
Authentication router
Handles user authentication, token management, and Google OAuth
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from app.core.database import get_db
from app.core.security import create_access_token, create_refresh_token, verify_token
from app.core.dependencies import get_current_user, get_current_active_user
from app.core.config import settings
from app.models.user import User
from app.schemas.auth import (
    GoogleAuthRequest,
    GoogleAuthResponse,
    TokenResponse,
    RefreshTokenRequest,
    UserResponse
)
from app.services import user_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/google-login", response_model=GoogleAuthResponse, status_code=status.HTTP_200_OK)
async def google_auth(
    auth_data: GoogleAuthRequest,
    db: Session = Depends(get_db)
):
    """
    Google OAuth authentication endpoint.

    Verifies the Google-issued ID token server-side and creates or retrieves the
    user from the *verified* token claims (email, sub). Client-supplied identity
    is never trusted. Also links any guest orders/bookings placed under the same
    verified email.

    Args:
        auth_data: Google authentication data (idToken, and optional name/image)
        db: Database session

    Returns:
        User information with JWT tokens for API authentication
        (guest data automatically linked if applicable)

    Raises:
        HTTPException: If the Google token is invalid or the email is unverified
    """
    # Verify the ID token with Google. This validates the signature, audience
    # (must equal our OAuth client id), issuer and expiry — raising ValueError
    # on any failure.
    try:
        claims = google_id_token.verify_oauth2_token(
            auth_data.id_token,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google credentials",
        )

    # Only trust a verified email address from the token claims.
    if not claims.get("email") or not claims.get("email_verified"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google account email is not verified",
        )

    email = claims["email"]
    google_id = claims["sub"]
    name = auth_data.name or claims.get("name")
    image = auth_data.image or claims.get("picture")

    # Use user service to handle OAuth login with guest data linking
    user, created, link_stats = user_service.get_or_create_user_from_oauth(
        db=db,
        email=email,
        google_id=google_id,
        name=name,
        image=image
    )

    # Ensure user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    # Create JWT tokens for API authentication
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email}
    )
    refresh_token = create_refresh_token(
        data={"sub": str(user.id)}
    )

    # Return user data with tokens
    return GoogleAuthResponse(
        id=user.id,
        email=user.email,
        google_id=user.google_id,
        full_name=user.full_name,
        profile_picture_url=user.profile_picture_url,
        is_admin=user.is_admin,
        admin_role=user.admin_role,
        is_active=user.is_active,
        access_token=access_token,
        refresh_token=refresh_token
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user)
):
    """
    Get current authenticated user information

    Args:
        current_user: Current authenticated user from token

    Returns:
        User information
    """
    return current_user


@router.post("/refresh", response_model=TokenResponse)
async def refresh_access_token(
    token_data: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    """
    Refresh access token using refresh token

    Args:
        token_data: Refresh token
        db: Database session

    Returns:
        New access and refresh tokens

    Raises:
        HTTPException: If refresh token is invalid
    """
    # Verify refresh token
    payload = verify_token(token_data.refresh_token, token_type="refresh")

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get user ID from token
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get user from database
    from uuid import UUID
    try:
        user = db.query(User).filter(User.id == UUID(user_id)).first()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create new tokens
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email}
    )
    refresh_token = create_refresh_token(
        data={"sub": str(user.id)}
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token
    )


@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_user)
):
    """
    Logout current user
    Note: With JWT, logout is handled client-side by removing tokens
    This endpoint can be used for logging/analytics

    Args:
        current_user: Current authenticated user

    Returns:
        Success message
    """
    # In a JWT-based system, logout is primarily client-side
    # However, this endpoint can be used for:
    # 1. Logging logout events
    # 2. Invalidating refresh tokens (if stored in DB)
    # 3. Analytics

    return {
        "message": "Successfully logged out",
        "user_id": str(current_user.id)
    }


@router.post("/guest", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_guest_user(
    email: str,
    name: str = None,
    db: Session = Depends(get_db)
):
    """
    Create a guest user account (without Google OAuth)
    Used for checkout and booking without registration

    Args:
        email: Guest email address
        name: Optional guest name
        db: Database session

    Returns:
        Created guest user

    Raises:
        HTTPException: If user with email already exists
    """
    try:
        guest_user = user_service.create_guest_user(
            db=db,
            email=email,
            name=name
        )
        return guest_user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/link-guest-data")
async def link_guest_data(
    guest_email: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Link guest orders and bookings to the authenticated user's account.

    A user may only link guest data placed under their *own* verified email
    address. Linking arbitrary emails would let any authenticated user absorb
    another person's guest orders and bookings.

    Args:
        guest_email: Must match the authenticated user's own email
        current_user: Current authenticated user
        db: Database session

    Returns:
        Link statistics

    Raises:
        HTTPException: If the email does not match the authenticated user
    """
    if guest_email.strip().lower() != (current_user.email or "").strip().lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only link guest data for your own verified email address"
        )

    try:
        link_stats = user_service.link_guest_data_to_user(
            db=db,
            user_id=current_user.id,
            guest_email=current_user.email
        )
        return {
            "message": "Guest data successfully linked",
            **link_stats
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
