"""
Product Variant API routes
Admin-only endpoints for product variant management
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from uuid import UUID
from typing import Optional

from app.core.database import get_db
from app.core.dependencies import get_current_admin_user
from app.models.user import User
from app.schemas.product_variant import (
    ProductVariantCreate,
    ProductVariantUpdate,
    ProductVariantResponse,
    ProductVariantListResponse
)
from app.services import product_variant_service

router = APIRouter(prefix="/admin/products", tags=["admin", "product-variants"])


@router.get("/{product_id}/variants", response_model=ProductVariantListResponse)
async def list_product_variants(
    product_id: UUID,
    variant_type: Optional[str] = Query(None, description="Filter by variant type"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Get all variants for a product

    **Admin only**

    Returns variants ordered by type and value.
    Can filter by variant_type and is_active.
    """
    variants = product_variant_service.get_product_variants(
        db, product_id, variant_type, is_active
    )

    return ProductVariantListResponse(
        items=variants,
        total=len(variants)
    )


@router.get("/{product_id}/variants/types", response_model=list[str])
async def list_variant_types(
    product_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Get list of unique variant types for a product

    **Admin only**

    Returns list of variant types (e.g., ['color', 'size']).
    Useful for building variant selection UI.
    """
    variant_types = product_variant_service.get_variant_types(db, product_id)
    return variant_types


@router.get("/{product_id}/variants/inventory", response_model=dict)
async def get_total_variant_inventory(
    product_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Get total inventory across all variants

    **Admin only**

    Returns total inventory count summed across all variants.
    """
    total = product_variant_service.get_total_variant_inventory(db, product_id)
    return {"product_id": product_id, "total_inventory": total}


@router.post("/{product_id}/variants", response_model=ProductVariantResponse, status_code=status.HTTP_201_CREATED)
async def create_variant(
    product_id: UUID,
    variant_data: ProductVariantCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Create a new product variant

    **Admin only**

    Variant type and value combination must be unique per product.
    SKU is auto-generated if not provided (based on product SKU).
    Price adjustment can be positive or negative.
    """
    try:
        variant = product_variant_service.create_variant(db, product_id, variant_data)
        return variant
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/variants/{variant_id}", response_model=ProductVariantResponse)
async def get_variant(
    variant_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Get a specific product variant by ID

    **Admin only**
    """
    variant = product_variant_service.get_variant_by_id(db, variant_id)

    if not variant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product variant with ID {variant_id} not found"
        )

    return variant


@router.put("/variants/{variant_id}", response_model=ProductVariantResponse)
async def update_variant(
    variant_id: UUID,
    variant_data: ProductVariantUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Update a product variant

    **Admin only**

    Cannot update to a type/value combination that already exists for the product.
    SKU must remain unique if changed.
    """
    try:
        variant = product_variant_service.update_variant(db, variant_id, variant_data)

        if not variant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product variant with ID {variant_id} not found"
            )

        return variant
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/variants/{variant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_variant(
    variant_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Delete a product variant

    **Admin only**

    Cannot delete a variant that has associated orders.
    Consider marking variants as inactive instead of deleting them.
    """
    try:
        deleted = product_variant_service.delete_variant(db, variant_id)

        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product variant with ID {variant_id} not found"
            )

        return None
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.patch("/variants/{variant_id}/inventory", response_model=ProductVariantResponse)
async def update_variant_inventory(
    variant_id: UUID,
    quantity_delta: int = Query(..., description="Change in inventory (positive or negative)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Update variant inventory count

    **Admin only**

    Use positive values to add inventory, negative values to reduce.
    Cannot reduce inventory below zero.
    Each variant tracks its own inventory separately from the base product.
    """
    try:
        variant = product_variant_service.update_variant_inventory(
            db, variant_id, quantity_delta
        )

        if not variant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product variant with ID {variant_id} not found"
            )

        return variant
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
