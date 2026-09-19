"""Vision registration confirmation email is fire-and-forget.

The registration is already committed when the email is sent, so a failing
mail provider must never surface to the caller (readiness finding L1).
"""
from unittest.mock import patch

from app.routers.vision import _send_vision_confirmation


def test_confirmation_send_swallows_provider_failure():
    """A provider exception is logged, not raised."""
    with patch("app.services.email_service.email_service.send_vision_registration_confirmation") as send:
        send.side_effect = RuntimeError("provider down")

        # Must not raise.
        _send_vision_confirmation(
            to_email="client@example.com",
            full_name="Test Client",
            interests=["Spa Treatments"],
        )

    send.assert_called_once()


def test_confirmation_send_forwards_arguments():
    with patch("app.services.email_service.email_service.send_vision_registration_confirmation") as send:
        _send_vision_confirmation(
            to_email="client@example.com",
            full_name="Test Client",
            interests=["Full-service Salon", "Barbershop Services"],
        )

    send.assert_called_once_with(
        to_email="client@example.com",
        full_name="Test Client",
        interests=["Full-service Salon", "Barbershop Services"],
    )
