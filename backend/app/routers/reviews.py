"""Public review API routes."""
import math
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_admin_user, get_current_user
from app.models.user import User
from app.schemas.review import (
    ProductRatingSummary,
    ReviewAdminUpdate,
    ReviewCreate,
    ReviewListResponse,
    ReviewResponse,
    ReviewUpdate,
)
from app.services import review_service

router = APIRouter(tags=["Product Reviews"])


@router.post("/products/{product_id}/reviews", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
async def create_product_review(
    product_id: UUID,
    review_data: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a review for a product (authenticated users only).

    **Requirements:**
    - User must be authenticated
    - One review per user per product (cannot review same product twice)
    - Verified purchase flag set automatically if user purchased the product
    - Reviews require admin approval before being publicly visible

    **Request:**
    - rating: Integer from 1 to 5 stars
    - review_text: Optional review text (min 10 chars if provided)

    **Response:**
    - Created review with is_approved=False (pending admin approval)
    - is_verified_purchase=True if user has purchased the product
    """
    success, message, review = review_service.create_review(
        db=db,
        product_id=product_id,
        user_id=current_user.id,
        rating=review_data.rating,
        review_text=review_data.review_text,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message,
        )

    return review


@router.get("/products/{product_id}/reviews", response_model=ReviewListResponse)
async def list_product_reviews(
    product_id: UUID,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=50, alias="pageSize", description="Items per page"),
    sort_by: str = Query("created_at", alias="sortBy", description="Sort field (created_at, rating, helpful_count)"),
    sort_order: str = Query("desc", alias="sortOrder", pattern="^(asc|desc)$", description="Sort order"),
    db: Session = Depends(get_db),
):
    """
    Get paginated list of approved reviews for a product (public).

    **Returns only approved reviews** (is_approved=True)

    Query parameters:
    - **page**: Page number (default: 1)
    - **pageSize**: Items per page (default: 10, max: 50)
    - **sortBy**: Sort field - created_at, rating, or helpful_count (default: created_at)
    - **sortOrder**: Sort order - asc or desc (default: desc)

    **Response includes:**
    - Review rating and text
    - User information
    - Verified purchase badge
    - Admin replies
    - Helpful count
    - Timestamps
    """
    skip = (page - 1) * page_size

    reviews, total = review_service.get_product_reviews(
        db=db,
        product_id=product_id,
        skip=skip,
        limit=page_size,
        approved_only=True,  # Only show approved reviews to public
        sort_by=sort_by,
        sort_order=sort_order,
    )

    total_pages = math.ceil(total / page_size) if total > 0 else 1

    return ReviewListResponse(
        reviews=reviews,
        total=total,
        page=page,
        pageSize=page_size,
        totalPages=total_pages,
    )


@router.get("/products/{product_id}/reviews/my-review", response_model=ReviewResponse)
async def get_my_review_for_product(
    product_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get current user's review for a product (authenticated).

    Returns the authenticated user's review for the specified product,
    regardless of approval status. Used to check if user has already
    reviewed the product and to show pending review.

    Returns 404 if user hasn't reviewed this product yet.
    """
    review = review_service.get_user_review_for_product(db, current_user.id, product_id)

    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You have not reviewed this product yet",
        )

    return review


# ---------------------------------------------------------------------------
# Merged from app/api/routes/reviews.py (Cut List: duplicate review routes).
#
# That module declared six endpoints, two of which — POST and GET
# /products/{id}/reviews — were exact duplicates of the ones above. Both
# routers were registered, FastAPI matched whichever was registered first, and
# the copies below it were unreachable. That is a drift hazard rather than mere
# dead weight: a fix applied to the shadowed copy would appear correct in the
# source and do nothing at runtime. The duplicates are deleted; these four,
# which were the only live ones, moved here so a single router owns reviews.
# ---------------------------------------------------------------------------


@router.get(
    "/products/{product_id}/reviews/summary",
    response_model=ProductRatingSummary,
    summary="Get product rating summary",
)
def get_product_rating_summary(
    product_id: str,
    db: Session = Depends(get_db),
):
    """
    Get rating summary for a product.

    Returns:
        - Total number of reviews
        - Average rating
        - Distribution of ratings (1-5 stars)
    """
    from uuid import UUID

    try:
        product_uuid = UUID(product_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid product ID format",
        )

    summary = review_service.get_product_rating_summary(db, product_uuid)

    return ProductRatingSummary(
        totalReviews=summary["total_reviews"],
        averageRating=summary["average_rating"],
        ratingDistribution=summary["rating_distribution"],
    )


@router.put(
    "/reviews/{review_id}",
    response_model=ReviewResponse,
    summary="Update a review",
)
def update_review(
    review_id: str,
    review_data: ReviewUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update a review.

    Users can only update their own reviews.
    Updated reviews require re-approval by admin.

    Returns:
        Updated review
    """
    from uuid import UUID

    try:
        review_uuid = UUID(review_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid review ID format",
        )

    success, message, review = review_service.update_review(
        db=db,
        review_id=review_uuid,
        user_id=current_user.id,
        rating=review_data.rating,
        review_text=review_data.review_text,
    )

    if not success:
        if "not found" in message.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=message,
            )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=message,
        )

    return review


@router.delete(
    "/reviews/{review_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a review",
)
def delete_review(
    review_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a review.

    Users can only delete their own reviews.
    """
    from uuid import UUID

    try:
        review_uuid = UUID(review_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid review ID format",
        )

    success, message = review_service.delete_review(
        db=db,
        review_id=review_uuid,
        user_id=current_user.id,
    )

    if not success:
        if "not found" in message.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=message,
            )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=message,
        )


@router.patch(
    "/admin/reviews/{review_id}",
    response_model=ReviewResponse,
    summary="Admin update review",
)
def admin_update_review(
    review_id: str,
    review_data: ReviewAdminUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Admin update review approval status and add reply.

    Only admins can approve/reject reviews and add admin replies.

    Returns:
        Updated review
    """
    from uuid import UUID

    try:
        review_uuid = UUID(review_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid review ID format",
        )

    success, message, review = review_service.admin_update_review(
        db=db,
        review_id=review_uuid,
        is_approved=review_data.is_approved,
        admin_reply=review_data.admin_reply,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=message,
        )

    return review
