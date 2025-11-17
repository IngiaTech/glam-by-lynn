"""
Public Booking API routes
Publicly accessible endpoints for booking availability
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import date as date_type, timedelta
from typing import Optional

from app.core.database import get_db
from app.schemas.booking import AvailabilityResponse
from app.services import booking_service

router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.get("/availability", response_model=AvailabilityResponse)
async def get_booking_availability(
    start_date: date_type = Query(..., description="Start date for availability check"),
    end_date: Optional[date_type] = Query(None, description="End date for availability check"),
    days: int = Query(7, ge=1, le=30, description="Number of days to check (if end_date not provided)"),
    db: Session = Depends(get_db)
):
    """
    Get booking availability for a date range (public endpoint)

    **Publicly accessible - No authentication required**

    Returns available time slots for booking, excluding:
    - Past dates
    - Manually blocked dates (from calendar_availability table)
    - Already booked slots

    Query parameters:
    - **start_date**: Start date for availability check (required)
    - **end_date**: End date for availability check (optional)
    - **days**: Number of days to check if end_date not provided (default: 7, max: 30)

    Returns:
    - List of dates with available time slots
    - Working hours information
    - Reasons for unavailable slots

    Working Hours:
    - Start: 8:00 AM
    - End: 6:00 PM
    - Slot duration: 1 hour
    """
    # Validate date range
    if end_date and end_date < start_date:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="end_date must be after start_date"
        )

    # Get availability
    availability = booking_service.get_availability(
        db=db,
        start_date=start_date,
        end_date=end_date,
        days=days
    )

    return availability
