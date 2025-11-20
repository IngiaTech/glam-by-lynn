"""Tests for product search functionality."""
from decimal import Decimal

import pytest
from fastapi import status

from app.models.product import Brand, Category, Product


@pytest.fixture
def sample_brand(db_session):
    """Create a sample brand."""
    brand = Brand(
        name="Fenty Beauty",
        slug="fenty-beauty",
        description="Beauty for all",
        is_active=True,
    )
    db_session.add(brand)
    db_session.commit()
    db_session.refresh(brand)
    return brand


@pytest.fixture
def another_brand(db_session):
    """Create another brand."""
    brand = Brand(
        name="MAC Cosmetics",
        slug="mac-cosmetics",
        description="Professional makeup",
        is_active=True,
    )
    db_session.add(brand)
    db_session.commit()
    db_session.refresh(brand)
    return brand


@pytest.fixture
def sample_category(db_session):
    """Create a sample category."""
    category = Category(
        name="Foundation",
        slug="foundation",
        description="Face foundations",
        is_active=True,
    )
    db_session.add(category)
    db_session.commit()
    db_session.refresh(category)
    return category


@pytest.fixture
def another_category(db_session):
    """Create another category."""
    category = Category(
        name="Lipstick",
        slug="lipstick",
        description="Lip colors",
        is_active=True,
    )
    db_session.add(category)
    db_session.commit()
    db_session.refresh(category)
    return category


@pytest.fixture
def sample_products(db_session, sample_brand, another_brand, sample_category, another_category):
    """Create sample products for search testing."""
    products = [
        Product(
            title="Fenty Pro Filt'r Foundation",
            slug="fenty-pro-filtr-foundation",
            description="Long-wearing foundation with buildable coverage",
            brand_id=sample_brand.id,
            category_id=sample_category.id,
            base_price=Decimal("3400.00"),
            inventory_count=50,
            is_active=True,
        ),
        Product(
            title="MAC Studio Fix Fluid Foundation",
            slug="mac-studio-fix-fluid",
            description="Medium-to-full coverage foundation",
            brand_id=another_brand.id,
            category_id=sample_category.id,
            base_price=Decimal("2800.00"),
            inventory_count=30,
            is_active=True,
        ),
        Product(
            title="Fenty Stunna Lip Paint",
            slug="fenty-stunna-lip-paint",
            description="Longwear fluid lip color",
            brand_id=sample_brand.id,
            category_id=another_category.id,
            base_price=Decimal("2000.00"),
            inventory_count=100,
            is_active=True,
        ),
        Product(
            title="MAC Ruby Woo Lipstick",
            slug="mac-ruby-woo-lipstick",
            description="Iconic matte red lipstick",
            brand_id=another_brand.id,
            category_id=another_category.id,
            base_price=Decimal("1800.00"),
            inventory_count=75,
            is_active=True,
        ),
        Product(
            title="Expensive Luxury Foundation",
            slug="expensive-luxury-foundation",
            description="Premium high-end foundation",
            brand_id=sample_brand.id,
            category_id=sample_category.id,
            base_price=Decimal("8000.00"),
            inventory_count=10,
            is_active=True,
        ),
        Product(
            title="Inactive Foundation Product",
            slug="inactive-foundation",
            description="This product is inactive",
            brand_id=sample_brand.id,
            category_id=sample_category.id,
            base_price=Decimal("1000.00"),
            inventory_count=0,
            is_active=False,  # Inactive product
        ),
    ]

    for product in products:
        db_session.add(product)
    db_session.commit()

    return products


def test_search_products_by_title(client, sample_products):
    """Test searching products by title."""
    response = client.get("/products/search?q=foundation")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert "products" in data
    assert "total" in data
    assert "query" in data
    assert data["query"] == "foundation"

    # Should find 3 active foundation products (not the inactive one)
    assert data["total"] == 3
    assert len(data["products"]) == 3

    # All results should have "foundation" in title or description
    for product in data["products"]:
        title_desc = (product["title"] + product.get("description", "")).lower()
        assert "foundation" in title_desc


def test_search_products_by_brand_name(client, sample_products):
    """Test searching products by brand name."""
    response = client.get("/products/search?q=fenty")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    # Should find 3 Fenty products (not the inactive one)
    assert data["total"] == 3

    # All results should be Fenty products
    for product in data["products"]:
        assert product["brand"] is not None
        assert "fenty" in product["brand"]["name"].lower()


def test_search_products_by_category_name(client, sample_products):
    """Test searching products by category name."""
    response = client.get("/products/search?q=lipstick")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    # Should find 2 lipstick products
    assert data["total"] == 2

    # All results should be in lipstick category or have lipstick in title
    for product in data["products"]:
        is_lipstick_category = product["category"] and "lipstick" in product["category"]["name"].lower()
        is_lipstick_title = "lipstick" in product["title"].lower()
        assert is_lipstick_category or is_lipstick_title


def test_search_products_with_brand_filter(client, sample_products, sample_brand):
    """Test searching with brand filter."""
    response = client.get(f"/products/search?q=pro&brandId={sample_brand.id}")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    # Should only get Fenty products
    assert data["total"] > 0
    for product in data["products"]:
        assert product["brand"]["id"] == str(sample_brand.id)


def test_search_products_with_category_filter(client, sample_products, sample_category):
    """Test searching with category filter."""
    response = client.get(f"/products/search?q=foundation&categoryId={sample_category.id}")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    # Should only get foundation category products
    assert data["total"] > 0
    for product in data["products"]:
        assert product["category"]["id"] == str(sample_category.id)


def test_search_products_with_price_filters(client, sample_products):
    """Test searching with price filters."""
    # Search for products between 2000 and 3500
    response = client.get("/products/search?q=foundation&minPrice=2000&maxPrice=3500")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    # Should find products in price range
    assert data["total"] > 0
    for product in data["products"]:
        # Check both possible field names (snake_case or camelCase)
        price = float(product.get("basePrice") or product.get("base_price"))
        assert 2000 <= price <= 3500


def test_search_products_pagination(client, sample_products):
    """Test search pagination."""
    # Get first page with limit 2
    response = client.get("/products/search?q=fenty&skip=0&limit=2")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert data["total"] == 3
    assert len(data["products"]) == 2
    assert data["skip"] == 0
    assert data["limit"] == 2

    # Get second page
    response = client.get("/products/search?q=fenty&skip=2&limit=2")
    data = response.json()

    assert data["total"] == 3
    assert len(data["products"]) == 1  # Only 1 remaining


def test_search_products_empty_query(client):
    """Test search with empty query returns 422."""
    response = client.get("/products/search?q=")

    # Should return validation error for empty query
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_search_products_no_results(client, sample_products):
    """Test search with no matching results."""
    response = client.get("/products/search?q=nonexistentproduct")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert data["total"] == 0
    assert len(data["products"]) == 0


def test_search_products_case_insensitive(client, sample_products):
    """Test search is case-insensitive."""
    # Search with uppercase
    response1 = client.get("/products/search?q=FENTY")
    # Search with lowercase
    response2 = client.get("/products/search?q=fenty")
    # Search with mixed case
    response3 = client.get("/products/search?q=FeNtY")

    assert response1.status_code == status.HTTP_200_OK
    assert response2.status_code == status.HTTP_200_OK
    assert response3.status_code == status.HTTP_200_OK

    data1 = response1.json()
    data2 = response2.json()
    data3 = response3.json()

    # All should return the same results
    assert data1["total"] == data2["total"] == data3["total"]


def test_search_excludes_inactive_products(client, sample_products):
    """Test that search excludes inactive products."""
    response = client.get("/products/search?q=inactive")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    # Should not find the inactive product
    assert data["total"] == 0


def test_get_product_suggestions(client, sample_products):
    """Test getting product autocomplete suggestions."""
    response = client.get("/products/suggestions?q=fenty")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert "suggestions" in data
    assert "query" in data
    assert data["query"] == "fenty"

    # Should get suggestions
    assert len(data["suggestions"]) > 0

    # Each suggestion should have required fields
    for suggestion in data["suggestions"]:
        assert "id" in suggestion
        assert "title" in suggestion
        assert "slug" in suggestion
        assert "brandName" in suggestion or suggestion["brandName"] is None


def test_get_product_suggestions_limit(client, sample_products):
    """Test suggestions limit parameter."""
    response = client.get("/products/suggestions?q=foundation&limit=2")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    # Should return max 2 suggestions
    assert len(data["suggestions"]) <= 2


def test_get_product_suggestions_by_brand(client, sample_products):
    """Test suggestions can find by brand name."""
    response = client.get("/products/suggestions?q=mac")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    # Should find MAC products
    assert len(data["suggestions"]) > 0

    # At least one should be a MAC product
    mac_found = any("MAC" in s["brandName"] for s in data["suggestions"] if s["brandName"])
    assert mac_found


def test_get_product_suggestions_empty_query(client):
    """Test suggestions with empty query returns 422."""
    response = client.get("/products/suggestions?q=")

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_get_product_suggestions_no_results(client, sample_products):
    """Test suggestions with no matching results."""
    response = client.get("/products/suggestions?q=nonexistent")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert len(data["suggestions"]) == 0


def test_get_product_suggestions_excludes_inactive(client, sample_products):
    """Test that suggestions exclude inactive products."""
    response = client.get("/products/suggestions?q=inactive")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    # Should not suggest inactive product
    assert len(data["suggestions"]) == 0
