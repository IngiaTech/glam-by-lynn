"""
Booking service
Business logic for booking availability and management
"""
from datetime import datetime, timedelta
from datetime import date as date_type
from datetime import time as time_type
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.models.booking import Booking
from app.models.service import CalendarAvailability
from app.schemas.booking import DateAvailability, TimeSlot, AvailabilityResponse


# Define working hours
WORKING_HOURS_START = time_type(8, 0)  # 8:00 AM
WORKING_HOURS_END = time_type(18, 0)   # 6:00 PM
SLOT_DURATION_MINUTES = 60             # 1-hour slots


def get_time_slots() -> list[time_type]:
    """
    Generate list of available time slots within working hours

    Returns:
        List of time slots (hourly intervals)
    """
    slots = []
    current_time = datetime.combine(date_type.today(), WORKING_HOURS_START)
    end_time = datetime.combine(date_type.today(), WORKING_HOURS_END)

    while current_time < end_time:
        slots.append(current_time.time())
        current_time += timedelta(minutes=SLOT_DURATION_MINUTES)

    return slots


def is_slot_available(
    db: Session,
    check_date: date_type,
    check_time: time_type
) -> tuple[bool, Optional[str]]:
    """
    Check if a specific date and time slot is available

    Args:
        db: Database session
        check_date: Date to check
        check_time: Time to check

    Returns:
        Tuple of (is_available, reason)
    """
    # Check if the date is in the past
    if check_date < date_type.today():
        return False, "Past date"

    # Check calendar availability (manually blocked dates)
    calendar_block = db.query(CalendarAvailability).filter(
        and_(
            CalendarAvailability.date == check_date,
            CalendarAvailability.time_slot == check_time,
            CalendarAvailability.is_available == False
        )
    ).first()

    if calendar_block:
        return False, calendar_block.reason or "Unavailable"

    # Check if there's already a booking for this slot
    existing_booking = db.query(Booking).filter(
        and_(
            Booking.booking_date == check_date,
            Booking.booking_time == check_time,
            Booking.status.in_(['pending', 'confirmed', 'deposit_paid'])
        )
    ).first()

    if existing_booking:
        return False, "Booked"

    return True, None


def get_availability(
    db: Session,
    start_date: date_type,
    end_date: Optional[date_type] = None,
    days: int = 7
) -> AvailabilityResponse:
    """
    Get booking availability for a date range

    Args:
        db: Database session
        start_date: Start date for availability check
        end_date: End date for availability check (optional)
        days: Number of days to check if end_date not provided (default: 7)

    Returns:
        AvailabilityResponse with date and time slot availability
    """
    # Determine end date
    if end_date is None:
        end_date = start_date + timedelta(days=days - 1)

    # Ensure we don't check too far in advance (max 90 days)
    max_end_date = date_type.today() + timedelta(days=90)
    if end_date > max_end_date:
        end_date = max_end_date

    # Get all time slots
    time_slots = get_time_slots()

    # Check availability for each date
    date_availability_list = []
    current_date = start_date

    while current_date <= end_date:
        slots = []
        has_available_slot = False

        for slot_time in time_slots:
            is_available, reason = is_slot_available(db, current_date, slot_time)

            if is_available:
                has_available_slot = True

            slots.append(TimeSlot(
                time=slot_time,
                is_available=is_available,
                reason=reason
            ))

        date_availability_list.append(DateAvailability(
            date=current_date,
            is_available=has_available_slot,
            slots=slots
        ))

        current_date += timedelta(days=1)

    return AvailabilityResponse(
        dates=date_availability_list,
        working_hours_start=WORKING_HOURS_START,
        working_hours_end=WORKING_HOURS_END
    )
