"""
Tests for booking availability API endpoints
"""
import pytest
from datetime import date, time, timedelta


class TestBookingAvailabilityAPI:
    """Test suite for booking availability endpoints (no authentication required)"""

    def test_get_availability_basic(self, client):
        """Test getting availability for a basic date range"""
        start_date = (date.today() + timedelta(days=1)).isoformat()

        response = client.get(f"/api/bookings/availability?start_date={start_date}")
        assert response.status_code == 200

        data = response.json()
        assert "dates" in data
        assert "working_hours_start" in data
        assert "working_hours_end" in data
        assert len(data["dates"]) == 7  # Default 7 days

    def test_get_availability_with_custom_days(self, client):
        """Test getting availability with custom number of days"""
        start_date = (date.today() + timedelta(days=1)).isoformat()

        response = client.get(f"/api/bookings/availability?start_date={start_date}&days=14")
        assert response.status_code == 200

        data = response.json()
        assert len(data["dates"]) == 14

    def test_get_availability_with_end_date(self, client):
        """Test getting availability with explicit end date"""
        start_date = (date.today() + timedelta(days=1)).isoformat()
        end_date = (date.today() + timedelta(days=10)).isoformat()

        response = client.get(
            f"/api/bookings/availability?start_date={start_date}&end_date={end_date}"
        )
        assert response.status_code == 200

        data = response.json()
        assert len(data["dates"]) == 10

    def test_availability_excludes_booked_slots(self, client, db_session):
        """Test that booked slots are marked as unavailable"""
        from app.models.booking import Booking
        from app.models.service import ServicePackage, TransportLocation

        # Create test package and location
        package = ServicePackage(
            package_type="regular",
            name="Test Package",
            base_other_price=3000,
            duration_minutes=60,
            is_active=True
        )
        location = TransportLocation(
            location_name="Test Location",
            transport_cost=0,
            is_free=True
        )
        db_session.add_all([package, location])
        db_session.commit()
        db_session.refresh(package)
        db_session.refresh(location)

        # Create a booking for tomorrow at 10:00
        booking_date = date.today() + timedelta(days=1)
        booking_time = time(10, 0)

        booking = Booking(
            booking_number="BK0001",
            package_id=package.id,
            location_id=location.id,
            booking_date=booking_date,
            booking_time=booking_time,
            num_others=1,
            subtotal=3000,
            transport_cost=0,
            total_amount=3000,
            status="confirmed",
            guest_email="test@example.com",
            guest_name="Test User",
            guest_phone="1234567890"
        )
        db_session.add(booking)
        db_session.commit()

        # Check availability
        response = client.get(
            f"/api/bookings/availability?start_date={booking_date.isoformat()}&days=1"
        )
        assert response.status_code == 200

        data = response.json()
        assert len(data["dates"]) == 1

        # Find the 10:00 slot
        date_data = data["dates"][0]
        slot_10am = next((s for s in date_data["slots"] if s["time"] == "10:00:00"), None)

        assert slot_10am is not None
        assert slot_10am["is_available"] is False
        assert slot_10am["reason"] == "Booked"

    def test_availability_excludes_blocked_slots(self, client, db_session):
        """Test that manually blocked slots are marked as unavailable"""
        from app.models.service import CalendarAvailability

        # Block tomorrow at 14:00
        blocked_date = date.today() + timedelta(days=1)
        blocked_time = time(14, 0)

        calendar_block = CalendarAvailability(
            date=blocked_date,
            time_slot=blocked_time,
            is_available=False,
            reason="Staff meeting"
        )
        db_session.add(calendar_block)
        db_session.commit()

        # Check availability
        response = client.get(
            f"/api/bookings/availability?start_date={blocked_date.isoformat()}&days=1"
        )
        assert response.status_code == 200

        data = response.json()
        assert len(data["dates"]) == 1

        # Find the 14:00 slot
        date_data = data["dates"][0]
        slot_2pm = next((s for s in date_data["slots"] if s["time"] == "14:00:00"), None)

        assert slot_2pm is not None
        assert slot_2pm["is_available"] is False
        assert slot_2pm["reason"] == "Staff meeting"

    def test_availability_respects_working_hours(self, client):
        """Test that only working hours slots are returned"""
        start_date = (date.today() + timedelta(days=1)).isoformat()

        response = client.get(f"/api/bookings/availability?start_date={start_date}&days=1")
        assert response.status_code == 200

        data = response.json()
        assert data["working_hours_start"] == "08:00:00"
        assert data["working_hours_end"] == "18:00:00"

        # Check that slots are within working hours
        date_data = data["dates"][0]
        for slot in date_data["slots"]:
            slot_time = time.fromisoformat(slot["time"])
            assert slot_time >= time(8, 0)
            assert slot_time < time(18, 0)

    def test_availability_date_has_available_flag(self, client, db_session):
        """Test that dates have is_available flag based on available slots"""
        from app.models.booking import Booking
        from app.models.service import ServicePackage, TransportLocation

        # Create test package and location
        package = ServicePackage(
            package_type="regular",
            name="Test Package",
            base_other_price=3000,
            duration_minutes=60,
            is_active=True
        )
        location = TransportLocation(
            location_name="Test Location",
            transport_cost=0,
            is_free=True
        )
        db_session.add_all([package, location])
        db_session.commit()
        db_session.refresh(package)
        db_session.refresh(location)

        # Book all slots for tomorrow
        booking_date = date.today() + timedelta(days=1)

        # Create bookings for all hourly slots from 8:00 to 17:00
        for hour in range(8, 18):
            booking = Booking(
                booking_number=f"BK{hour:04d}",
                package_id=package.id,
                location_id=location.id,
                booking_date=booking_date,
                booking_time=time(hour, 0),
                num_others=1,
                subtotal=3000,
                transport_cost=0,
                total_amount=3000,
                status="confirmed",
                guest_email=f"test{hour}@example.com",
                guest_name=f"Test User {hour}",
                guest_phone="1234567890"
            )
            db_session.add(booking)
        db_session.commit()

        # Check availability
        response = client.get(
            f"/api/bookings/availability?start_date={booking_date.isoformat()}&days=1"
        )
        assert response.status_code == 200

        data = response.json()
        date_data = data["dates"][0]

        # Date should be marked as not available since all slots are booked
        assert date_data["is_available"] is False

    def test_availability_invalid_date_range(self, client):
        """Test that end_date before start_date returns error"""
        start_date = (date.today() + timedelta(days=10)).isoformat()
        end_date = (date.today() + timedelta(days=5)).isoformat()

        response = client.get(
            f"/api/bookings/availability?start_date={start_date}&end_date={end_date}"
        )
        assert response.status_code == 400
        assert "end_date must be after start_date" in response.json()["detail"]

    def test_availability_cancelled_bookings_not_excluded(self, client, db_session):
        """Test that cancelled bookings don't block slots"""
        from app.models.booking import Booking
        from app.models.service import ServicePackage, TransportLocation

        # Create test package and location
        package = ServicePackage(
            package_type="regular",
            name="Test Package",
            base_other_price=3000,
            duration_minutes=60,
            is_active=True
        )
        location = TransportLocation(
            location_name="Test Location",
            transport_cost=0,
            is_free=True
        )
        db_session.add_all([package, location])
        db_session.commit()
        db_session.refresh(package)
        db_session.refresh(location)

        # Create a cancelled booking for tomorrow at 10:00
        booking_date = date.today() + timedelta(days=1)
        booking_time = time(10, 0)

        booking = Booking(
            booking_number="BK0001",
            package_id=package.id,
            location_id=location.id,
            booking_date=booking_date,
            booking_time=booking_time,
            num_others=1,
            subtotal=3000,
            transport_cost=0,
            total_amount=3000,
            status="cancelled",  # Cancelled status
            guest_email="test@example.com",
            guest_name="Test User",
            guest_phone="1234567890"
        )
        db_session.add(booking)
        db_session.commit()

        # Check availability
        response = client.get(
            f"/api/bookings/availability?start_date={booking_date.isoformat()}&days=1"
        )
        assert response.status_code == 200

        data = response.json()
        # Find the 10:00 slot
        date_data = data["dates"][0]
        slot_10am = next((s for s in date_data["slots"] if s["time"] == "10:00:00"), None)

        # Cancelled booking should not block the slot
        assert slot_10am is not None
        assert slot_10am["is_available"] is True

    def test_availability_max_days_limit(self, client):
        """Test that days parameter respects maximum limit"""
        start_date = (date.today() + timedelta(days=1)).isoformat()

        # Try to request more than 30 days (max limit)
        response = client.get(f"/api/bookings/availability?start_date={start_date}&days=40")
        assert response.status_code == 422  # Validation error

    def test_availability_time_slots_are_hourly(self, client):
        """Test that time slots are hourly intervals"""
        start_date = (date.today() + timedelta(days=1)).isoformat()

        response = client.get(f"/api/bookings/availability?start_date={start_date}&days=1")
        assert response.status_code == 200

        data = response.json()
        date_data = data["dates"][0]

        # Should have 10 hourly slots (8:00 to 17:00)
        assert len(date_data["slots"]) == 10

        # Verify slots are hourly
        expected_times = [f"{h:02d}:00:00" for h in range(8, 18)]
        actual_times = [slot["time"] for slot in date_data["slots"]]
        assert actual_times == expected_times
