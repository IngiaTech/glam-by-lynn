"""Health endpoints, ported from the dead app/tests scaffold.

`/health/db` is Render's configured `healthCheckPath` (set in #215), so if it
regresses a deploy fails rather than merely losing an endpoint. These tests
lived in backend/app/tests/, which `testpaths = tests` never collected — so
they had never actually run. Ported here as part of merging that scaffold away
(Cut List hygiene).
"""
from fastapi.testclient import TestClient


def test_root_endpoint(client: TestClient):
    response = client.get("/")

    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Glam by Lynn API is running"
    assert data["status"] == "healthy"
    assert "version" in data


def test_health_check_endpoint(client: TestClient):
    response = client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "app_name" in data
    assert "version" in data
    assert "environment" in data


def test_database_health_check_endpoint(client: TestClient):
    """The endpoint Render polls; it must report a live database."""
    response = client.get("/health/db")

    assert response.status_code == 200
    data = response.json()
    assert data["database"] == "connected"
    assert data["status"] == "healthy"
