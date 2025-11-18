"""Transport location service for business logic."""
from typing import List, Optional
from uuid import UUID

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.service import TransportLocation
from app.schemas.location import TransportLocationCreate, TransportLocationUpdate


class LocationAlreadyExistsError(Exception):
    """Raised when trying to create a location with duplicate name."""
    pass


def get_all_locations(
    db: Session,
    include_inactive: bool = False
) -> List[TransportLocation]:
    """
    Get all transport locations.

    Args:
        db: Database session
        include_inactive: Include inactive locations

    Returns:
        List of transport locations
    """
    query = db.query(TransportLocation)

    if not include_inactive:
        query = query.filter(TransportLocation.is_active == True)

    return query.order_by(TransportLocation.location_name).all()


def get_location_by_id(
    db: Session,
    location_id: UUID
) -> Optional[TransportLocation]:
    """Get a transport location by ID."""
    return db.query(TransportLocation).filter(
        TransportLocation.id == location_id
    ).first()


def create_location(
    db: Session,
    location_data: TransportLocationCreate
) -> TransportLocation:
    """
    Create a new transport location.

    Args:
        db: Database session
        location_data: Location creation data

    Returns:
        Created transport location

    Raises:
        LocationAlreadyExistsError: If location name already exists
    """
    # Check if location with this name already exists
    existing = db.query(TransportLocation).filter(
        TransportLocation.location_name == location_data.location_name
    ).first()

    if existing:
        raise LocationAlreadyExistsError(
            f"Location '{location_data.location_name}' already exists"
        )

    location = TransportLocation(
        location_name=location_data.location_name,
        county=location_data.county,
        transport_cost=location_data.transport_cost,
        is_free=location_data.is_free,
        is_active=location_data.is_active,
    )

    db.add(location)
    try:
        db.commit()
        db.refresh(location)
        return location
    except IntegrityError:
        db.rollback()
        raise LocationAlreadyExistsError(
            f"Location '{location_data.location_name}' already exists"
        )


def update_location(
    db: Session,
    location_id: UUID,
    location_data: TransportLocationUpdate
) -> Optional[TransportLocation]:
    """
    Update a transport location.

    Args:
        db: Database session
        location_id: Location ID
        location_data: Location update data

    Returns:
        Updated location or None if not found

    Raises:
        LocationAlreadyExistsError: If new name conflicts with existing location
    """
    location = get_location_by_id(db, location_id)
    if not location:
        return None

    # Check for name conflicts if name is being changed
    if location_data.location_name and location_data.location_name != location.location_name:
        existing = db.query(TransportLocation).filter(
            TransportLocation.location_name == location_data.location_name,
            TransportLocation.id != location_id
        ).first()

        if existing:
            raise LocationAlreadyExistsError(
                f"Location '{location_data.location_name}' already exists"
            )

    # Update fields
    update_data = location_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(location, field, value)

    try:
        db.commit()
        db.refresh(location)
        return location
    except IntegrityError:
        db.rollback()
        raise LocationAlreadyExistsError(
            "Location name conflict"
        )


def delete_location(
    db: Session,
    location_id: UUID
) -> bool:
    """
    Delete a transport location.

    Args:
        db: Database session
        location_id: Location ID

    Returns:
        True if deleted, False if not found
    """
    location = get_location_by_id(db, location_id)
    if not location:
        return False

    db.delete(location)
    db.commit()
    return True
