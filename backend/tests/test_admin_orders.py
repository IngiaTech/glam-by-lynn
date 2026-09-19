"""Tests for the admin order lifecycle API (readiness finding M13)."""
from decimal import Decimal

import pytest
from fastapi import status

from app.models.order import Order, OrderItem
from app.models.product import Product, ProductVariant


@pytest.fixture
def sample_product(db_session):
    """A product with known stock, so restocking is observable."""
    product = Product(
        title="Matte Lipstick",
        slug="matte-lipstick",
        description="Long-wear matte lipstick",
        base_price=Decimal("1500.00"),
        inventory_count=10,
        is_active=True,
    )
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)
    return product


@pytest.fixture
def sample_variant(db_session, sample_product):
    variant = ProductVariant(
        product_id=sample_product.id,
        variant_type="Shade",
        variant_value="Ruby",
        sku="LIP-RUBY",
        price_adjustment=Decimal("0.00"),
        inventory_count=5,
    )
    db_session.add(variant)
    db_session.commit()
    db_session.refresh(variant)
    return variant


def _make_order(db_session, product, **overrides):
    """Create a pending guest order holding 2 units of `product`."""
    fields = dict(
        order_number="ORD-20260101-AAA11",
        guest_email="customer@example.com",
        guest_name="Wanjiku Customer",
        guest_phone="+254712345678",
        delivery_county="Nairobi",
        delivery_town="Westlands",
        delivery_address="1 Test Road",
        subtotal=Decimal("3000.00"),
        discount_amount=Decimal("0.00"),
        delivery_fee=Decimal("0.00"),
        total_amount=Decimal("3000.00"),
        payment_method="mpesa",
        payment_confirmed=False,
        status="pending",
    )
    fields.update(overrides)

    order = Order(**fields)
    db_session.add(order)
    db_session.flush()

    db_session.add(
        OrderItem(
            order_id=order.id,
            product_id=product.id,
            product_title=product.title,
            product_sku="LIP-001",
            quantity=2,
            unit_price=Decimal("1500.00"),
            discount=Decimal("0.00"),
            total_price=Decimal("3000.00"),
        )
    )
    db_session.commit()
    db_session.refresh(order)
    return order


@pytest.fixture
def pending_order(db_session, sample_product):
    return _make_order(db_session, sample_product)


class TestAdminOrderAccess:
    """The admin list must be the whole shop, and admin-only."""

    def test_list_requires_authentication(self, client):
        response = client.get("/api/admin/orders")
        assert response.status_code in (
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        )

    def test_list_rejects_non_admin(self, client, user_headers, pending_order):
        response = client.get("/api/admin/orders", headers=user_headers)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_list_returns_orders_the_admin_does_not_own(
        self, client, admin_headers, pending_order
    ):
        """The regression this endpoint exists for: admins saw only their own orders."""
        response = client.get("/api/admin/orders", headers=admin_headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["total"] == 1
        assert data["orders"][0]["orderNumber"] == pending_order.order_number
        # Guest order — no user_id at all, so it could never appear in a
        # caller-scoped listing.
        assert data["orders"][0]["userId"] is None

    def test_list_filters_by_status(self, client, admin_headers, db_session, sample_product):
        _make_order(db_session, sample_product)
        _make_order(
            db_session, sample_product, order_number="ORD-20260101-BBB22", status="shipped"
        )

        response = client.get("/api/admin/orders?status=shipped", headers=admin_headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["total"] == 1
        assert data["orders"][0]["status"] == "shipped"

    def test_list_searches_by_order_number(
        self, client, admin_headers, db_session, sample_product
    ):
        _make_order(db_session, sample_product)
        _make_order(db_session, sample_product, order_number="ORD-20260101-ZZZ99")

        response = client.get("/api/admin/orders?search=ZZZ99", headers=admin_headers)

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["total"] == 1

    def test_detail_exposes_admin_only_fields(self, client, admin_headers, pending_order):
        response = client.get(
            f"/api/admin/orders/{pending_order.id}", headers=admin_headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "trackingNumber" in data
        assert "adminNotes" in data
        assert len(data["orderItems"]) == 1

    def test_detail_404_for_unknown_order(self, client, admin_headers):
        response = client.get(
            "/api/admin/orders/00000000-0000-0000-0000-000000000000",
            headers=admin_headers,
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestOrderStatusTransitions:
    def test_valid_transition_succeeds(self, client, admin_headers, pending_order):
        response = client.put(
            f"/api/admin/orders/{pending_order.id}/status",
            headers=admin_headers,
            json={"status": "processing"},
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["status"] == "processing"

    def test_transition_records_an_admin_note(self, client, admin_headers, pending_order):
        response = client.put(
            f"/api/admin/orders/{pending_order.id}/status",
            headers=admin_headers,
            json={"status": "processing", "adminNotes": "Stock picked"},
        )

        notes = response.json()["adminNotes"]
        assert "pending" in notes and "processing" in notes
        assert "Stock picked" in notes

    def test_confirming_payment_via_status_sets_the_payment_flag(
        self, client, admin_headers, pending_order
    ):
        response = client.put(
            f"/api/admin/orders/{pending_order.id}/status",
            headers=admin_headers,
            json={"status": "payment_confirmed"},
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["paymentConfirmed"] is True

    def test_illegal_transition_is_rejected(self, client, admin_headers, pending_order):
        """pending -> delivered skips fulfilment entirely."""
        response = client.put(
            f"/api/admin/orders/{pending_order.id}/status",
            headers=admin_headers,
            json={"status": "delivered"},
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "pending" in response.json()["detail"]

    def test_terminal_status_cannot_be_changed(
        self, client, admin_headers, db_session, sample_product
    ):
        delivered = _make_order(
            db_session, sample_product, order_number="ORD-20260101-DDD44", status="delivered"
        )

        response = client.put(
            f"/api/admin/orders/{delivered.id}/status",
            headers=admin_headers,
            json={"status": "processing"},
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "final" in response.json()["detail"].lower()

    def test_unknown_status_is_rejected(self, client, admin_headers, pending_order):
        response = client.put(
            f"/api/admin/orders/{pending_order.id}/status",
            headers=admin_headers,
            json={"status": "refunded"},
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_status_update_rejects_non_admin(self, client, user_headers, pending_order):
        response = client.put(
            f"/api/admin/orders/{pending_order.id}/status",
            headers=user_headers,
            json={"status": "processing"},
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestCancellationRestocksInventory:
    def test_cancelling_returns_stock(
        self, client, admin_headers, db_session, sample_product, pending_order
    ):
        starting_stock = sample_product.inventory_count

        response = client.put(
            f"/api/admin/orders/{pending_order.id}/status",
            headers=admin_headers,
            json={"status": "cancelled", "adminNotes": "Customer changed their mind"},
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["status"] == "cancelled"

        db_session.refresh(sample_product)
        assert sample_product.inventory_count == starting_stock + 2

    def test_cancelling_restocks_variants_too(
        self, client, admin_headers, db_session, sample_product, sample_variant
    ):
        order = Order(
            order_number="ORD-20260101-VVV55",
            guest_email="customer@example.com",
            guest_name="Wanjiku Customer",
            guest_phone="+254712345678",
            delivery_county="Nairobi",
            delivery_town="Westlands",
            delivery_address="1 Test Road",
            subtotal=Decimal("1500.00"),
            discount_amount=Decimal("0.00"),
            delivery_fee=Decimal("0.00"),
            total_amount=Decimal("1500.00"),
            status="pending",
        )
        db_session.add(order)
        db_session.flush()
        db_session.add(
            OrderItem(
                order_id=order.id,
                product_id=sample_product.id,
                product_variant_id=sample_variant.id,
                product_title=sample_product.title,
                product_sku=sample_variant.sku,
                quantity=1,
                unit_price=Decimal("1500.00"),
                discount=Decimal("0.00"),
                total_price=Decimal("1500.00"),
            )
        )
        db_session.commit()

        product_stock = sample_product.inventory_count
        variant_stock = sample_variant.inventory_count

        response = client.put(
            f"/api/admin/orders/{order.id}/status",
            headers=admin_headers,
            json={"status": "cancelled"},
        )

        assert response.status_code == status.HTTP_200_OK
        db_session.refresh(sample_product)
        db_session.refresh(sample_variant)
        assert sample_product.inventory_count == product_stock + 1
        assert sample_variant.inventory_count == variant_stock + 1

    def test_stock_cannot_be_returned_twice(
        self, client, admin_headers, db_session, sample_product, pending_order
    ):
        """'cancelled' is terminal, so a second cancel can't double-restock."""
        starting_stock = sample_product.inventory_count

        first = client.put(
            f"/api/admin/orders/{pending_order.id}/status",
            headers=admin_headers,
            json={"status": "cancelled"},
        )
        assert first.status_code == status.HTTP_200_OK

        second = client.put(
            f"/api/admin/orders/{pending_order.id}/status",
            headers=admin_headers,
            json={"status": "cancelled"},
        )
        assert second.status_code == status.HTTP_400_BAD_REQUEST

        db_session.refresh(sample_product)
        assert sample_product.inventory_count == starting_stock + 2


class TestDeliveryFee:
    def test_setting_the_fee_recomputes_the_total(
        self, client, admin_headers, pending_order
    ):
        response = client.put(
            f"/api/admin/orders/{pending_order.id}/delivery",
            headers=admin_headers,
            json={"deliveryFee": "350.00", "adminNotes": "Westlands rider"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert Decimal(data["deliveryFee"]) == Decimal("350.00")
        assert Decimal(data["totalAmount"]) == Decimal("3350.00")

    def test_repeated_edits_do_not_compound(self, client, admin_headers, pending_order):
        """The total is recomputed from subtotal - discount + fee, not adjusted."""
        client.put(
            f"/api/admin/orders/{pending_order.id}/delivery",
            headers=admin_headers,
            json={"deliveryFee": "350.00"},
        )
        response = client.put(
            f"/api/admin/orders/{pending_order.id}/delivery",
            headers=admin_headers,
            json={"deliveryFee": "500.00"},
        )

        assert Decimal(response.json()["totalAmount"]) == Decimal("3500.00")

    def test_fee_respects_an_existing_discount(
        self, client, admin_headers, db_session, sample_product
    ):
        discounted = _make_order(
            db_session,
            sample_product,
            order_number="ORD-20260101-CCC33",
            discount_amount=Decimal("500.00"),
            total_amount=Decimal("2500.00"),
        )

        response = client.put(
            f"/api/admin/orders/{discounted.id}/delivery",
            headers=admin_headers,
            json={"deliveryFee": "200.00"},
        )

        # 3000 subtotal - 500 discount + 200 delivery
        assert Decimal(response.json()["totalAmount"]) == Decimal("2700.00")

    def test_negative_fee_is_rejected(self, client, admin_headers, pending_order):
        response = client.put(
            f"/api/admin/orders/{pending_order.id}/delivery",
            headers=admin_headers,
            json={"deliveryFee": "-50.00"},
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_cannot_set_a_fee_on_a_cancelled_order(
        self, client, admin_headers, db_session, sample_product
    ):
        cancelled = _make_order(
            db_session, sample_product, order_number="ORD-20260101-EEE55", status="cancelled"
        )

        response = client.put(
            f"/api/admin/orders/{cancelled.id}/delivery",
            headers=admin_headers,
            json={"deliveryFee": "200.00"},
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_delivery_update_rejects_non_admin(self, client, user_headers, pending_order):
        response = client.put(
            f"/api/admin/orders/{pending_order.id}/delivery",
            headers=user_headers,
            json={"deliveryFee": "200.00"},
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestFulfilmentDetails:
    def test_setting_tracking_number(self, client, admin_headers, pending_order):
        response = client.put(
            f"/api/admin/orders/{pending_order.id}",
            headers=admin_headers,
            json={"trackingNumber": "G4S-99881"},
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["trackingNumber"] == "G4S-99881"

    def test_marking_payment_received(self, client, admin_headers, pending_order):
        response = client.put(
            f"/api/admin/orders/{pending_order.id}",
            headers=admin_headers,
            json={"paymentConfirmed": True},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["paymentConfirmed"] is True
        assert "Payment marked as received" in data["adminNotes"]

    def test_update_does_not_touch_the_status(self, client, admin_headers, pending_order):
        response = client.put(
            f"/api/admin/orders/{pending_order.id}",
            headers=admin_headers,
            json={"paymentConfirmed": True, "trackingNumber": "G4S-1"},
        )
        assert response.json()["status"] == "pending"

    def test_update_404_for_unknown_order(self, client, admin_headers):
        response = client.put(
            "/api/admin/orders/00000000-0000-0000-0000-000000000000",
            headers=admin_headers,
            json={"trackingNumber": "X"},
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
