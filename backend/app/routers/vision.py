"""2026 Vision interest registration API routes."""
import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.vision import VisionRegistrationCreate, VisionRegistrationResponse
from app.services import vision_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["2026 Vision"])


@router.post("/vision/register", response_model=VisionRegistrationResponse, status_code=status.HTTP_201_CREATED)
async def register_vision_interest(
    registration_data: VisionRegistrationCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Register interest in 2026 vision expansion (public).

    The 2026 vision represents Glam by Lynn's planned expansion into:
    - Full-service salon
    - Barbershop services
    - Spa treatments
    - Mobile beauty van

    **Request:**
    - fullName: Full name (required)
    - email: Email address (required, validated)
    - phoneNumber: Phone number (required)
    - location: Location/city (optional)
    - interestedInSalon: Interest in salon (boolean)
    - interestedInBarbershop: Interest in barbershop (boolean)
    - interestedInSpa: Interest in spa (boolean)
    - interestedInMobileVan: Interest in mobile van (boolean)
    - additionalComments: Additional comments (optional)

    **Validation:**
    - Email must be valid format
    - At least one area of interest must be selected
    - Email can only register once (duplicate prevention)
    - Phone number must be valid

    **Response:**
    - Created registration with all details
    - Confirmation (email sending handled separately)

    **Errors:**
    - 400: Validation failed or email already registered
    """
    try:
        registration = vision_service.create_vision_registration(
            db=db,
            full_name=registration_data.full_name,
            email=registration_data.email,
            phone_number=registration_data.phone_number,
            location=registration_data.location,
            interested_in_salon=registration_data.interested_in_salon,
            interested_in_barbershop=registration_data.interested_in_barbershop,
            interested_in_spa=registration_data.interested_in_spa,
            interested_in_mobile_van=registration_data.interested_in_mobile_van,
            additional_comments=registration_data.additional_comments,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    # Send the confirmation after the response, like bookings and orders do.
    # Sending it inline blocks the event loop for the length of the provider
    # call (up to the SDK's 30s timeout), stalling every concurrent request.
    try:
        interests = []
        if registration.interested_in_salon:
            interests.append("Full-service Salon")
        if registration.interested_in_barbershop:
            interests.append("Barbershop Services")
        if registration.interested_in_spa:
            interests.append("Spa Treatments")
        if registration.interested_in_mobile_van:
            interests.append("Mobile Beauty Van")

        background_tasks.add_task(
            _send_vision_confirmation,
            to_email=registration.email,
            full_name=registration.full_name,
            interests=interests,
        )
    except Exception:  # pragma: no cover - defensive; registration is committed
        logger.exception(
            "Failed to schedule vision confirmation email for registration %s",
            registration.id,
        )

    return registration


def _send_vision_confirmation(to_email: str, full_name: str, interests: list[str]) -> None:
    """Send the vision confirmation email, swallowing provider failures.

    Runs as a BackgroundTask: the registration is already committed, so a mail
    outage must never surface to the caller.
    """
    from app.services.email_service import email_service

    try:
        email_service.send_vision_registration_confirmation(
            to_email=to_email,
            full_name=full_name,
            interests=interests,
        )
    except Exception:
        logger.exception("Vision registration confirmation email failed for %s", to_email)
