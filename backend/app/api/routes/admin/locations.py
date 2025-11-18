"""Admin API endpoints for transport locations."""
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_admin_user
from app.models.user import User
from app.schemas.location import (
    TransportLocationCreate,
    TransportLocationResponse,
    TransportLocationUpdate,
)
from app.services.location_service import (
    LocationAlreadyExistsError,
    create_location,
    delete_location,
    get_all_locations,
    get_location_by_id,
    update_location,
)

router = APIRouter(prefix="/admin/locations", tags=["admin", "locations"])


@router.get("", response_model=List[TransportLocationResponse])
def list_locations(
    include_inactive: bool = Query(False, description="Include inactive locations"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Get all transport locations (admin only).

    - **include_inactive**: Include inactive locations in results
    """
    locations = get_all_locations(db, include_inactive=include_inactive)
    return locations


@router.get("/{location_id}", response_model=TransportLocationResponse)
def get_location(
    location_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Get a specific transport location by ID (admin only)."""
    location = get_location_by_id(db, location_id)
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found"
        )
    return location


@router.post("", response_model=TransportLocationResponse, status_code=status.HTTP_201_CREATED)
def create_new_location(
    location_data: TransportLocationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Create a new transport location (admin only).

    - **locationName**: Unique name for the location
    - **county**: Optional county/region
    - **transportCost**: Cost for transport to this location (default: 0)
    - **isFree**: Mark as free transport location (default: false)
    - **isActive**: Active status (default: true)
    """
    try:
        location = create_location(db, location_data)
        return location
    except LocationAlreadyExistsError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )


@router.put("/{location_id}", response_model=TransportLocationResponse)
def update_existing_location(
    location_id: UUID,
    location_data: TransportLocationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Update a transport location (admin only).

    Partial updates are supported - only provide fields to update.
    """
    try:
        location = update_location(db, location_id, location_data)
        if not location:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Location not found"
            )
        return location
    except LocationAlreadyExistsError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )


@router.delete("/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_location(
    location_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Delete a transport location (admin only).

    Note: This will fail if there are existing bookings associated with this location.
    """
    deleted = delete_location(db, location_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found"
        )
    return None
