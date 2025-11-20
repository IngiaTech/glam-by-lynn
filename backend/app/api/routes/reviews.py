"""Review API routes."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_current_admin_user
from app.models.user import User
from app.schemas.review import (
    ReviewCreate,
    ReviewUpdate,
    ReviewAdminUpdate,
    ReviewResponse,
    ReviewListResponse,
    ProductRatingSummary,
)
from app.services import review_service

router = APIRouter(tags=["Reviews"])


@router.post(
    "/products/{product_id}/reviews",
    response_model=ReviewResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a product review",
)
def create_review(
    product_id: str,
    review_data: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new product review.

    **Requirements:**
    - User must be authenticated
    - User can only create one review per product
    - Review requires admin approval before being visible

    **Verified Purchase:**
    - If user has a delivered order containing this product, the review is marked as verified purchase

    Returns:
        Created review (unapproved)
    """
    from uuid import UUID

    try:
        product_uuid = UUID(product_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid product ID format",
        )

    success, message, review = review_service.create_review(
        db=db,
        user_id=current_user.id,
        product_id=product_uuid,
        rating=review_data.rating,
        review_text=review_data.review_text,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message,
        )

    return review


@router.get(
    "/products/{product_id}/reviews",
    response_model=ReviewListResponse,
    summary="Get product reviews",
)
def get_product_reviews(
    product_id: str,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, alias="pageSize", description="Page size"),
    db: Session = Depends(get_db),
):
    """
    Get paginated list of approved reviews for a product.

    Only approved reviews are returned to public users.
    Reviews are sorted by creation date (newest first).

    Query Parameters:
        page: Page number (default: 1)
        pageSize: Number of reviews per page (default: 20, max: 100)

    Returns:
        Paginated list of reviews with average rating
    """
    from uuid import UUID

    try:
        product_uuid = UUID(product_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid product ID format",
        )

    reviews, total, total_pages = review_service.get_product_reviews(
        db=db,
        product_id=product_uuid,
        page=page,
        page_size=page_size,
        only_approved=True,
    )

    # Calculate average rating
    average_rating = None
    if reviews:
        average_rating = sum(review.rating for review in reviews) / len(reviews)

    return ReviewListResponse(
        reviews=reviews,
        total=total,
        page=page,
        pageSize=page_size,
        totalPages=total_pages,
        averageRating=average_rating,
    )


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


@router.post(
    "/reviews/{review_id}/helpful",
    status_code=status.HTTP_200_OK,
    summary="Mark review as helpful",
)
def mark_review_helpful(
    review_id: str,
    db: Session = Depends(get_db),
):
    """
    Increment the helpful count for a review.

    No authentication required (can be done by anyone).
    """
    from uuid import UUID

    try:
        review_uuid = UUID(review_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid review ID format",
        )

    success, message = review_service.increment_helpful_count(db, review_uuid)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=message,
        )

    return {"message": "Review marked as helpful"}
