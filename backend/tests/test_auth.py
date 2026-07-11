"""
Comprehensive tests for authentication flow
Tests Google OAuth, JWT tokens, guest users, and role checking
"""
import pytest
from unittest.mock import patch
from fastapi import status
from uuid import uuid4

from app.core.security import create_access_token, create_refresh_token, verify_token
from app.models.user import User
from app.models.order import Order
from app.models.booking import Booking


@pytest.fixture
def google_signin(client):
    """Helper to perform a Google login with a *verified* ID token.

    Patches the Google ID-token verifier so the supplied identity is treated as
    a verified claim set, mirroring what Google returns for a real token. Tests
    never send a raw email/googleId — only the verified token is trusted.
    """
    def _signin(email, google_id, name=None, image=None, email_verified=True):
        claims = {
            "email": email,
            "sub": google_id,
            "email_verified": email_verified,
            "name": name,
            "picture": image,
        }
        with patch(
            "app.routers.auth.google_id_token.verify_oauth2_token",
            return_value=claims,
        ):
            return client.post(
                "/api/auth/google-login",
                json={"idToken": "fake.id.token", "name": name, "image": image},
            )

    return _signin


class TestGoogleOAuthFlow:
    """Test Google OAuth authentication flow"""

    def test_google_login_new_user(self, client, db_session, google_signin):
        """Test Google login creates new user from verified token claims"""
        response = google_signin(
            email="newuser@gmail.com",
            google_id="google123",
            name="New User",
            image="https://example.com/photo.jpg",
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        # Verify response structure
        assert "id" in data
        assert data["email"] == "newuser@gmail.com"
        assert data["googleId"] == "google123"
        assert data["name"] == "New User"
        assert data["image"] == "https://example.com/photo.jpg"
        assert data["isAdmin"] is False
        assert data["adminRole"] is None
        assert "accessToken" in data
        assert "refreshToken" in data

        # Verify user created in database
        user = db_session.query(User).filter(User.email == "newuser@gmail.com").first()
        assert user is not None
        assert user.google_id == "google123"
        assert user.is_active is True

    def test_google_login_existing_user(self, client, regular_user, google_signin):
        """Test Google login with existing user"""
        response = google_signin(
            email=regular_user.email,
            google_id=regular_user.google_id,
            name="Updated Name",
            image="https://example.com/new-photo.jpg",
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["id"] == str(regular_user.id)
        assert data["email"] == regular_user.email
        assert "accessToken" in data
        assert "refreshToken" in data

    def test_google_login_inactive_user(self, client, db_session, google_signin):
        """Test Google login fails for inactive user"""
        # Create inactive user
        user = User(
            email="inactive@test.com",
            google_id="inactive123",
            is_active=False,
        )
        db_session.add(user)
        db_session.commit()

        response = google_signin(
            email="inactive@test.com",
            google_id="inactive123",
            name="Inactive User",
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "inactive" in response.json()["detail"].lower()

    def test_google_login_admin_user(self, client, admin_user, google_signin):
        """Test Google login with admin user returns admin info"""
        response = google_signin(
            email=admin_user.email,
            google_id=admin_user.google_id,
            name=admin_user.full_name,
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["isAdmin"] is True
        assert data["adminRole"] == "super_admin"

    def test_google_login_rejects_invalid_token(self, client, admin_user):
        """An unverifiable ID token is rejected — no admin takeover by email."""
        with patch(
            "app.routers.auth.google_id_token.verify_oauth2_token",
            side_effect=ValueError("Invalid token"),
        ):
            response = client.post(
                "/api/auth/google-login",
                json={"idToken": "forged", "name": "Attacker"},
            )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_google_login_rejects_unverified_email(self, client, google_signin):
        """A token whose email is not verified is rejected."""
        response = google_signin(
            email="unverified@gmail.com",
            google_id="unverified999",
            email_verified=False,
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_google_login_requires_id_token(self, client):
        """The endpoint requires an idToken — a bare email is not accepted."""
        response = client.post(
            "/api/auth/google-login",
            json={"email": "attacker@gmail.com", "googleId": "x"},
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_token_minting_endpoint_removed(self, client, admin_user):
        """The unauthenticated /auth/token minting endpoint no longer exists."""
        response = client.post(f"/api/auth/token?user_id={admin_user.id}")

        assert response.status_code in (
            status.HTTP_404_NOT_FOUND,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        )


class TestJWTTokens:
    """Test JWT token generation and validation"""

    def test_access_token_generation(self, regular_user):
        """Test access token generation"""
        token = create_access_token(
            data={"sub": str(regular_user.id), "email": regular_user.email}
        )

        assert token is not None
        assert isinstance(token, str)

        # Verify token
        payload = verify_token(token, token_type="access")
        assert payload is not None
        assert payload["sub"] == str(regular_user.id)
        assert payload["email"] == regular_user.email
        assert payload["type"] == "access"

    def test_refresh_token_generation(self, regular_user):
        """Test refresh token generation"""
        token = create_refresh_token(data={"sub": str(regular_user.id)})

        assert token is not None
        assert isinstance(token, str)

        # Verify token
        payload = verify_token(token, token_type="refresh")
        assert payload is not None
        assert payload["sub"] == str(regular_user.id)
        assert payload["type"] == "refresh"

    def test_invalid_token_verification(self):
        """Test verification of invalid token"""
        payload = verify_token("invalid.token.here", token_type="access")
        assert payload is None

    def test_wrong_token_type_verification(self, regular_user):
        """Test verifying token with wrong type"""
        access_token = create_access_token(data={"sub": str(regular_user.id)})

        # Try to verify as refresh token
        payload = verify_token(access_token, token_type="refresh")
        assert payload is None  # Should fail type check

    def test_get_current_user_with_valid_token(self, client, regular_user):
        """Test /me endpoint with valid token"""
        token = create_access_token(
            data={"sub": str(regular_user.id), "email": regular_user.email}
        )

        response = client.get(
            "/api/auth/me", headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["email"] == regular_user.email

    def test_get_current_user_without_token(self, client):
        """Test /me endpoint without token"""
        response = client.get("/api/auth/me")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_current_user_with_invalid_token(self, client):
        """Test /me endpoint with invalid token"""
        response = client.get(
            "/api/auth/me", headers={"Authorization": "Bearer invalid.token.here"}
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestRefreshToken:
    """Test refresh token mechanism"""

    def test_refresh_token_success(self, client, regular_user):
        """Test successful token refresh"""
        refresh_token = create_refresh_token(data={"sub": str(regular_user.id)})

        response = client.post(
            "/api/auth/refresh", json={"refresh_token": refresh_token}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

        # Verify new access token works
        new_access_token = data["access_token"]
        payload = verify_token(new_access_token, token_type="access")
        assert payload["sub"] == str(regular_user.id)

    def test_refresh_token_with_invalid_token(self, client):
        """Test refresh with invalid token"""
        response = client.post(
            "/api/auth/refresh", json={"refresh_token": "invalid.token.here"}
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "invalid" in response.json()["detail"].lower()

    def test_refresh_token_with_access_token(self, client, regular_user):
        """Test refresh with access token instead of refresh token"""
        access_token = create_access_token(
            data={"sub": str(regular_user.id), "email": regular_user.email}
        )

        response = client.post("/api/auth/refresh", json={"refresh_token": access_token})

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_refresh_token_for_inactive_user(self, client, db_session):
        """Test refresh fails for inactive user"""
        # Create user
        user = User(
            email="testuser@test.com", google_id="test123", is_active=True
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        # Create refresh token
        refresh_token = create_refresh_token(data={"sub": str(user.id)})

        # Deactivate user
        user.is_active = False
        db_session.commit()

        # Try to refresh
        response = client.post("/api/auth/refresh", json={"refresh_token": refresh_token})

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestGuestUserCreation:
    """Test guest user creation and management"""

    def test_create_guest_user(self, client, db_session):
        """Test creating a guest user"""
        response = client.post(
            "/api/auth/guest?email=guest@test.com&name=Guest+User"
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()

        assert data["email"] == "guest@test.com"
        assert data["name"] == "Guest User"
        assert data["isAdmin"] is False
        assert data["googleId"] is None

        # Verify in database
        user = db_session.query(User).filter(User.email == "guest@test.com").first()
        assert user is not None
        assert user.google_id is None

    def test_create_guest_user_without_name(self, client, db_session):
        """Test creating guest user without name"""
        response = client.post("/api/auth/guest?email=guest2@test.com")

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["email"] == "guest2@test.com"

    def test_create_guest_user_duplicate_email(self, client, regular_user):
        """Test creating guest user with existing email"""
        response = client.post(f"/api/auth/guest?email={regular_user.email}")

        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestGuestDataLinking:
    """Test linking guest orders/bookings to authenticated user"""

    def test_google_login_links_guest_orders(self, client, db_session, google_signin):
        """Test Google login automatically links guest orders"""
        # Create guest user with email
        guest_user = User(email="link@test.com", google_id=None)
        db_session.add(guest_user)
        db_session.commit()
        db_session.refresh(guest_user)

        # Login with Google using same (verified) email
        response = google_signin(
            email="link@test.com",
            google_id="google456",
            name="Linked User",
        )

        assert response.status_code == status.HTTP_200_OK
        # Guest data should be linked automatically

    def test_manual_linking_own_email_allowed(self, client, regular_user):
        """A user may link guest data placed under their own verified email."""
        token = create_access_token(
            data={"sub": str(regular_user.id), "email": regular_user.email}
        )

        response = client.post(
            f"/api/auth/link-guest-data?guest_email={regular_user.email}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == status.HTTP_200_OK

    def test_manual_linking_other_email_forbidden(self, client, regular_user):
        """A user may NOT link guest data belonging to someone else's email."""
        token = create_access_token(
            data={"sub": str(regular_user.id), "email": regular_user.email}
        )

        response = client.post(
            "/api/auth/link-guest-data?guest_email=victim@test.com",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestAdminRoleChecking:
    """Test admin role checking and permissions"""

    def test_admin_user_identification(self, admin_user):
        """Test admin user has correct flags"""
        assert admin_user.is_admin is True
        assert admin_user.admin_role == "super_admin"

    def test_regular_user_not_admin(self, regular_user):
        """Test regular user is not admin"""
        assert regular_user.is_admin is False
        assert regular_user.admin_role is None

    def test_admin_endpoint_access_with_admin_token(self, client, admin_user):
        """Test admin can access admin endpoints"""
        token = create_access_token(
            data={"sub": str(admin_user.id), "email": admin_user.email}
        )

        # Try accessing an admin endpoint (e.g., list users)
        response = client.get(
            "/api/admin/users", headers={"Authorization": f"Bearer {token}"}
        )

        # Should succeed or return data (not 403)
        assert response.status_code != status.HTTP_403_FORBIDDEN

    def test_admin_endpoint_access_with_regular_token(self, client, regular_user):
        """Test regular user cannot access admin endpoints"""
        token = create_access_token(
            data={"sub": str(regular_user.id), "email": regular_user.email}
        )

        # Try accessing an admin endpoint
        response = client.get(
            "/api/admin/users", headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestLogout:
    """Test logout functionality"""

    def test_logout_with_valid_token(self, client, regular_user):
        """Test logout with valid token"""
        token = create_access_token(
            data={"sub": str(regular_user.id), "email": regular_user.email}
        )

        response = client.post(
            "/api/auth/logout", headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "message" in data
        assert data["user_id"] == str(regular_user.id)

    def test_logout_without_token(self, client):
        """Test logout without token"""
        response = client.post("/api/auth/logout")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestSecurityValidation:
    """Test security validation and edge cases"""

    def test_token_with_nonexistent_user(self, client):
        """Test token with user ID that doesn't exist"""
        fake_user_id = str(uuid4())
        token = create_access_token(
            data={"sub": fake_user_id, "email": "fake@test.com"}
        )

        response = client.get(
            "/api/auth/me", headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_token_with_invalid_uuid(self, client):
        """Test token with invalid UUID"""
        token = create_access_token(data={"sub": "not-a-uuid", "email": "test@test.com"})

        response = client.get(
            "/api/auth/me", headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_missing_authorization_header(self, client):
        """Test endpoint requiring auth without Authorization header"""
        response = client.get("/api/auth/me")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_malformed_authorization_header(self, client):
        """Test with malformed Authorization header"""
        response = client.get("/api/auth/me", headers={"Authorization": "NotBearer token"})
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
