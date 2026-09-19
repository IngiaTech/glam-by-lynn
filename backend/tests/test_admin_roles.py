"""Tests for the collapsed admin role model (readiness finding M19).

Five roles used to be assignable while none was enforced — any admin had full
access whatever role they held. These pin the two roles that remain and the
distinction that is actually applied.
"""
from fastapi import status


class TestRoleAssignment:
    def test_admin_role_is_accepted(self, client, admin_headers, regular_user):
        response = client.put(
            f"/api/admin/users/{regular_user.id}/role",
            headers=admin_headers,
            json={"is_admin": True, "admin_role": "admin"},
        )
        # Either assigned, or refused because the email isn't whitelisted —
        # both prove the role value itself passed validation.
        assert response.status_code in (status.HTTP_200_OK, status.HTTP_403_FORBIDDEN)
        if response.status_code == status.HTTP_403_FORBIDDEN:
            assert "whitelisted" in response.json()["detail"]

    def test_removed_roles_are_rejected(self, client, admin_headers, regular_user):
        for role in ["product_manager", "booking_manager", "content_editor", "artist"]:
            response = client.put(
                f"/api/admin/users/{regular_user.id}/role",
                headers=admin_headers,
                json={"is_admin": True, "admin_role": role},
            )
            assert response.status_code == status.HTTP_400_BAD_REQUEST, role
            assert "Invalid admin role" in response.json()["detail"]

    def test_role_assignment_requires_super_admin(self, client, user_headers, regular_user):
        response = client.put(
            f"/api/admin/users/{regular_user.id}/role",
            headers=user_headers,
            json={"is_admin": True, "admin_role": "admin"},
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestRemovedGuards:
    def test_granular_guards_are_gone(self):
        """They enforced nothing; leaving them invites wiring them up by accident."""
        from app.core import dependencies

        for name in [
            "get_product_manager",
            "get_booking_manager",
            "get_content_editor",
            "get_artist",
            "require_role",
        ]:
            assert not hasattr(dependencies, name), f"{name} should have been removed"

    def test_enforced_guards_remain(self):
        from app.core import dependencies

        for name in ["get_current_admin_user", "get_current_super_admin"]:
            assert hasattr(dependencies, name)
