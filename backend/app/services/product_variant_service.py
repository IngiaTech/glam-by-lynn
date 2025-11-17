"""
Product Variant service
Business logic for product variant management
"""
from typing import Optional
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models.product import ProductVariant, Product
from app.schemas.product_variant import ProductVariantCreate, ProductVariantUpdate


def get_variant_by_id(db: Session, variant_id: UUID) -> Optional[ProductVariant]:
    """Get variant by ID"""
    return db.query(ProductVariant).filter(ProductVariant.id == variant_id).first()


def get_variant_by_sku(db: Session, sku: str) -> Optional[ProductVariant]:
    """Get variant by SKU"""
    return db.query(ProductVariant).filter(ProductVariant.sku == sku).first()


def get_product_variants(
    db: Session,
    product_id: UUID,
    variant_type: Optional[str] = None,
    is_active: Optional[bool] = None
) -> list[ProductVariant]:
    """
    Get all variants for a product

    Args:
        db: Database session
        product_id: Product ID
        variant_type: Filter by variant type
        is_active: Filter by active status

    Returns:
        List of product variants
    """
    query = db.query(ProductVariant).filter(ProductVariant.product_id == product_id)

    if variant_type:
        query = query.filter(ProductVariant.variant_type == variant_type.lower())

    if is_active is not None:
        query = query.filter(ProductVariant.is_active == is_active)

    return query.order_by(
        ProductVariant.variant_type,
        ProductVariant.variant_value
    ).all()


def get_variant_by_type_value(
    db: Session,
    product_id: UUID,
    variant_type: str,
    variant_value: str
) -> Optional[ProductVariant]:
    """
    Get variant by product, type, and value

    Args:
        db: Database session
        product_id: Product ID
        variant_type: Variant type
        variant_value: Variant value

    Returns:
        ProductVariant or None if not found
    """
    return db.query(ProductVariant).filter(
        and_(
            ProductVariant.product_id == product_id,
            ProductVariant.variant_type == variant_type.lower(),
            ProductVariant.variant_value == variant_value
        )
    ).first()


def create_variant(
    db: Session,
    product_id: UUID,
    variant_data: ProductVariantCreate
) -> ProductVariant:
    """
    Create a new product variant

    Args:
        db: Database session
        product_id: Product ID
        variant_data: Variant creation data

    Returns:
        Created variant

    Raises:
        ValueError: If product not found, duplicate variant, or SKU exists
    """
    # Verify product exists
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise ValueError(f"Product with ID {product_id} not found")

    # Check for duplicate variant (type + value combination)
    existing_variant = get_variant_by_type_value(
        db, product_id, variant_data.variant_type, variant_data.variant_value
    )
    if existing_variant:
        raise ValueError(
            f"Variant with type '{variant_data.variant_type}' and value '{variant_data.variant_value}' "
            f"already exists for this product"
        )

    # Check if SKU already exists
    if variant_data.sku:
        existing_sku = get_variant_by_sku(db, variant_data.sku)
        if existing_sku:
            raise ValueError(f"Variant with SKU '{variant_data.sku}' already exists")

    # Auto-generate SKU if not provided
    sku = variant_data.sku
    if not sku and product.sku:
        # Generate SKU based on product SKU and variant
        sku = f"{product.sku}-{variant_data.variant_type[:3].upper()}-{variant_data.variant_value[:3].upper()}"
        # Ensure uniqueness
        counter = 1
        original_sku = sku
        while get_variant_by_sku(db, sku):
            sku = f"{original_sku}-{counter}"
            counter += 1

    # Create variant
    variant = ProductVariant(
        product_id=product_id,
        variant_type=variant_data.variant_type.lower(),
        variant_value=variant_data.variant_value,
        price_adjustment=variant_data.price_adjustment,
        inventory_count=variant_data.inventory_count,
        sku=sku,
        is_active=variant_data.is_active
    )

    db.add(variant)
    db.commit()
    db.refresh(variant)

    return variant


def update_variant(
    db: Session,
    variant_id: UUID,
    variant_data: ProductVariantUpdate
) -> Optional[ProductVariant]:
    """
    Update a product variant

    Args:
        db: Database session
        variant_id: Variant ID to update
        variant_data: Variant update data

    Returns:
        Updated variant or None if not found

    Raises:
        ValueError: If new type/value combination is duplicate or SKU exists
    """
    variant = get_variant_by_id(db, variant_id)
    if not variant:
        return None

    # Check if new type/value combination creates duplicate
    if variant_data.variant_type is not None or variant_data.variant_value is not None:
        new_type = variant_data.variant_type if variant_data.variant_type is not None else variant.variant_type
        new_value = variant_data.variant_value if variant_data.variant_value is not None else variant.variant_value

        # Only check if it's actually changing
        if new_type != variant.variant_type or new_value != variant.variant_value:
            existing_variant = get_variant_by_type_value(
                db, variant.product_id, new_type, new_value
            )
            if existing_variant and existing_variant.id != variant_id:
                raise ValueError(
                    f"Variant with type '{new_type}' and value '{new_value}' "
                    f"already exists for this product"
                )

            # Update type and value
            if variant_data.variant_type is not None:
                variant.variant_type = variant_data.variant_type.lower()
            if variant_data.variant_value is not None:
                variant.variant_value = variant_data.variant_value

    # Check if new SKU conflicts
    if variant_data.sku is not None and variant_data.sku != variant.sku:
        if variant_data.sku:  # Only check if not setting to None
            existing_sku = get_variant_by_sku(db, variant_data.sku)
            if existing_sku and existing_sku.id != variant_id:
                raise ValueError(f"Variant with SKU '{variant_data.sku}' already exists")
        variant.sku = variant_data.sku

    # Update other fields
    if variant_data.price_adjustment is not None:
        variant.price_adjustment = variant_data.price_adjustment

    if variant_data.inventory_count is not None:
        variant.inventory_count = variant_data.inventory_count

    if variant_data.is_active is not None:
        variant.is_active = variant_data.is_active

    db.commit()
    db.refresh(variant)

    return variant


def delete_variant(db: Session, variant_id: UUID) -> bool:
    """
    Delete a product variant

    Args:
        db: Database session
        variant_id: Variant ID to delete

    Returns:
        True if deleted, False if not found

    Raises:
        ValueError: If variant has associated orders or cart items
    """
    variant = get_variant_by_id(db, variant_id)
    if not variant:
        return False

    # Check if variant has orders
    if variant.order_items.count() > 0:
        raise ValueError(
            f"Cannot delete variant '{variant.variant_type}: {variant.variant_value}' "
            "because it has associated orders. Consider marking it as inactive instead."
        )

    # Delete variant (cart items will be handled by application logic)
    db.delete(variant)
    db.commit()

    return True


def update_variant_inventory(
    db: Session,
    variant_id: UUID,
    quantity_delta: int
) -> Optional[ProductVariant]:
    """
    Update variant inventory count

    Args:
        db: Database session
        variant_id: Variant ID
        quantity_delta: Change in inventory (can be negative)

    Returns:
        Updated variant or None if not found

    Raises:
        ValueError: If resulting inventory would be negative
    """
    variant = get_variant_by_id(db, variant_id)
    if not variant:
        return None

    new_inventory = variant.inventory_count + quantity_delta
    if new_inventory < 0:
        raise ValueError(
            f"Insufficient inventory. Current: {variant.inventory_count}, "
            f"Requested: {abs(quantity_delta)}"
        )

    variant.inventory_count = new_inventory
    db.commit()
    db.refresh(variant)

    return variant


def get_variant_types(db: Session, product_id: UUID) -> list[str]:
    """
    Get list of unique variant types for a product

    Args:
        db: Database session
        product_id: Product ID

    Returns:
        List of variant types
    """
    result = db.query(ProductVariant.variant_type).filter(
        ProductVariant.product_id == product_id
    ).distinct().all()

    return [row[0] for row in result]


def get_total_variant_inventory(db: Session, product_id: UUID) -> int:
    """
    Get total inventory across all variants for a product

    Args:
        db: Database session
        product_id: Product ID

    Returns:
        Total inventory count
    """
    result = db.query(ProductVariant).filter(
        ProductVariant.product_id == product_id
    ).all()

    return sum(variant.inventory_count for variant in result)
