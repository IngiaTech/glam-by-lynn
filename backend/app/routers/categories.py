"""Public category API routes."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.category import CategoryResponse
from app.services import category_service

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[CategoryResponse])
async def list_public_categories(
    limit: int = Query(20, ge=1, le=100, description="Maximum number of categories to return"),
    db: Session = Depends(get_db),
):
    """
    Get active categories for public display (e.g. homepage "Shop by Category").

    Returns only active categories, ordered by display order, so the storefront
    can render category tiles with their images without requiring admin auth.
    """
    categories, _ = category_service.get_categories(
        db=db,
        skip=0,
        limit=limit,
        is_active=True,
    )
    return categories
