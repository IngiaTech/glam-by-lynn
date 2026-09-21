"""Tests for admin analytics API."""
from decimal import Decimal
from datetime import datetime, timedelta

import pytest
from fastapi import status

from app.models.booking import Booking
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.service import ServicePackage, TransportLocation
from app.models.user import User


@pytest.fixture
def admin_user(db_session):
    """Create an admin user for testing."""
    user = User(
        email="admin@example.com",
        google_id="admin123",
        full_name="Admin User",
        is_admin=True,
        admin_role="super_admin",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def admin_token(admin_user):
    """Create JWT token for admin user."""
    from app.core.security import create_access_token
    return create_access_token(data={"sub": str(admin_user.id), "email": admin_user.email})


@pytest.fixture
def regular_user(db_session):
    """Create a regular (non-admin) user for testing."""
    user = User(
        email="user@example.com",
        google_id="user123",
        full_name="Regular User",
        is_admin=False,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def regular_token(regular_user):
    """Create JWT token for regular user."""
    from app.core.security import create_access_token
    return create_access_token(data={"sub": str(regular_user.id), "email": regular_user.email})


@pytest.fixture
def sample_product(db_session):
    """Create a sample product."""
    product = Product(
        title="Test Lipstick",
        slug="test-lipstick",
        description="Test product",
        base_price=Decimal("1500.00"),
        inventory_count=100,
        is_active=True,
    )
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)
    return product


@pytest.fixture
def sample_service(db_session):
    """Create a sample service package."""
    service = ServicePackage(
        package_type="bridal_large",
        name="Bridal Makeup",
        description="Complete bridal makeup",
        base_bride_price=Decimal("5000.00"),
        base_maid_price=Decimal("3000.00"),
        duration_minutes=120,
        is_active=True,
    )
    db_session.add(service)
    db_session.commit()
    db_session.refresh(service)
    return service


@pytest.fixture
def sample_location(db_session):
    """Create a sample transport location."""
    location = TransportLocation(
        location_name="Nairobi CBD",
        transport_cost=Decimal("500.00"),
        is_active=True,
    )
    db_session.add(location)
    db_session.commit()
    db_session.refresh(location)
    return location


@pytest.fixture
def sample_orders(db_session, regular_user, sample_product):
    """Create sample orders for testing."""
    orders = []

    # Create an order from 2 days ago
    order1 = Order(
        order_number="ORD-TEST-001",
        user_id=regular_user.id,
        subtotal=Decimal("3000.00"),
        total_amount=Decimal("3000.00"),
        status="delivered",
        payment_confirmed=True,
        created_at=datetime.utcnow() - timedelta(days=2),
    )
    db_session.add(order1)
    db_session.flush()

    order_item1 = OrderItem(
        order_id=order1.id,
        product_id=sample_product.id,
        product_title=sample_product.title,
        quantity=2,
        unit_price=Decimal("1500.00"),
        total_price=Decimal("3000.00"),
    )
    db_session.add(order_item1)
    orders.append(order1)

    # Create an order from today
    order2 = Order(
        order_number="ORD-TEST-002",
        user_id=regular_user.id,
        subtotal=Decimal("1500.00"),
        total_amount=Decimal("1500.00"),
        status="delivered",
        payment_confirmed=True,
        created_at=datetime.utcnow(),
    )
    db_session.add(order2)
    db_session.flush()

    order_item2 = OrderItem(
        order_id=order2.id,
        product_id=sample_product.id,
        product_title=sample_product.title,
        quantity=1,
        unit_price=Decimal("1500.00"),
        total_price=Decimal("1500.00"),
    )
    db_session.add(order_item2)
    orders.append(order2)

    db_session.commit()
    return orders


@pytest.fixture
def sample_bookings(db_session, regular_user, sample_service, sample_location):
    """Create sample bookings for testing."""
    from datetime import date, time

    bookings = []

    # Create a confirmed booking from 3 days ago
    booking_date1 = date.today() + timedelta(days=7)
    booking1 = Booking(
        booking_number="BK-TEST-001",
        user_id=regular_user.id,
        package_id=sample_service.id,
        booking_date=booking_date1,
        booking_time=time(10, 0),
        location_id=sample_location.id,
        subtotal=Decimal("5000.00"),
        transport_cost=Decimal("500.00"),
        total_amount=Decimal("5500.00"),
        status="confirmed",
        created_at=datetime.utcnow() - timedelta(days=3),
    )
    db_session.add(booking1)
    bookings.append(booking1)

    # Create a pending booking from today
    booking_date2 = date.today() + timedelta(days=10)
    booking2 = Booking(
        booking_number="BK-TEST-002",
        user_id=regular_user.id,
        package_id=sample_service.id,
        booking_date=booking_date2,
        booking_time=time(14, 0),
        location_id=sample_location.id,
        subtotal=Decimal("5000.00"),
        transport_cost=Decimal("500.00"),
        total_amount=Decimal("5500.00"),
        status="pending",
        created_at=datetime.utcnow(),
    )
    db_session.add(booking2)
    bookings.append(booking2)

    db_session.commit()
    return bookings


def test_get_overview_analytics_success(client, admin_token, sample_orders, sample_bookings):
    """Test getting overview analytics with admin token."""
    response = client.get(
        "/api/admin/analytics/overview",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert "totalRevenue" in data
    assert "totalOrders" in data
    assert "totalBookings" in data
    assert "totalProducts" in data
    assert "totalCustomers" in data
    assert "pendingOrders" in data
    assert "pendingBookings" in data

    # Check that we have the orders and bookings we created
    assert data["totalOrders"] == 2
    assert data["totalBookings"] == 2


def test_get_overview_analytics_unauthorized(client, regular_token):
    """Test that regular users cannot access analytics."""
    response = client.get(
        "/api/admin/analytics/overview",
        headers={"Authorization": f"Bearer {regular_token}"},
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_get_overview_analytics_no_auth(client):
    """Test that unauthenticated requests are rejected."""
    response = client.get("/api/admin/analytics/overview")

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.parametrize(
    "path",
    [
        "/api/admin/analytics/sales",
        "/api/admin/analytics/products",
        "/api/admin/analytics/bookings",
        "/api/admin/booking-analytics/locations",
        "/api/admin/booking-analytics/popular-locations",
    ],
)
def test_removed_analytics_endpoints_are_gone(client, admin_token, path):
    """Only /analytics/overview is used by the dashboard (Cut List).

    Asserted with an admin token so a 404 means the route is genuinely absent,
    rather than an auth failure masking a route that still exists.
    """
    response = client.get(path, headers={"Authorization": f"Bearer {admin_token}"})

    assert response.status_code == status.HTTP_404_NOT_FOUND, path


# --- Recent activity -------------------------------------------------------
# The dashboard's "Recent Activity" panel used to render a hardcoded array
# ("New order #1234 placed — 2 minutes ago") whatever had actually happened.


def _activity(client, admin_token, **params):
    response = client.get(
        "/api/admin/analytics/recent-activity",
        params=params,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == status.HTTP_200_OK
    return response.json()


def test_recent_activity_merges_orders_and_bookings(
    client, admin_token, sample_orders, sample_bookings
):
    items = _activity(client, admin_token)

    assert {item["type"] for item in items} == {"order", "booking"}
    references = {item["reference"] for item in items}
    assert {"ORD-TEST-001", "ORD-TEST-002", "BK-TEST-001", "BK-TEST-002"} <= references


def test_recent_activity_is_newest_first(client, admin_token, sample_orders, sample_bookings):
    items = _activity(client, admin_token)

    timestamps = [item["createdAt"] for item in items]
    assert timestamps == sorted(timestamps, reverse=True)


def test_recent_activity_orders_by_when_placed_not_event_date(
    client, admin_token, db_session, regular_user, sample_service, sample_location
):
    """The admin bookings list sorts by booking_date, which is why it couldn't
    feed this panel. Here the two orderings disagree on purpose."""
    from datetime import date, time

    placed_long_ago_for_next_year = Booking(
        booking_number="BK-OLD-FAR",
        user_id=regular_user.id,
        package_id=sample_service.id,
        location_id=sample_location.id,
        booking_date=date.today() + timedelta(days=365),
        booking_time=time(10, 0),
        num_brides=1,
        subtotal=Decimal("5000.00"),
        transport_cost=Decimal("0.00"),
        total_amount=Decimal("5000.00"),
        status="confirmed",
        created_at=datetime.utcnow() - timedelta(days=60),
    )
    placed_just_now_for_next_week = Booking(
        booking_number="BK-NEW-NEAR",
        user_id=regular_user.id,
        package_id=sample_service.id,
        location_id=sample_location.id,
        booking_date=date.today() + timedelta(days=7),
        booking_time=time(11, 0),
        num_brides=1,
        subtotal=Decimal("5000.00"),
        transport_cost=Decimal("0.00"),
        total_amount=Decimal("5000.00"),
        status="pending",
        created_at=datetime.utcnow(),
    )
    db_session.add_all([placed_long_ago_for_next_year, placed_just_now_for_next_week])
    db_session.commit()

    references = [item["reference"] for item in _activity(client, admin_token)]

    assert references.index("BK-NEW-NEAR") < references.index("BK-OLD-FAR")


def test_recent_activity_respects_limit(client, admin_token, sample_orders, sample_bookings):
    assert len(_activity(client, admin_token, limit=2)) == 2


def test_recent_activity_is_empty_for_an_empty_store(client, admin_token):
    """No placeholder entries — an empty store shows an empty feed."""
    assert _activity(client, admin_token) == []


def test_recent_activity_requires_admin(client, regular_token):
    response = client.get(
        "/api/admin/analytics/recent-activity",
        headers={"Authorization": f"Bearer {regular_token}"},
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_recent_activity_requires_auth(client):
    response = client.get("/api/admin/analytics/recent-activity")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
