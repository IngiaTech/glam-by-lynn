"""No route is registered twice (Cut List: duplicate review routes).

Two routers both declared POST and GET /api/products/{id}/reviews. FastAPI
matches whichever was registered first, so the later copies were unreachable —
a drift hazard rather than dead weight, since a fix applied to the shadowed
copy looks right in the source and does nothing at runtime. #227 found this the
hard way: the duplicated "helpful" endpoint had to be removed from both files
or the survivor would have silently taken over.
"""
from collections import Counter

from app.main import app


def _registered_routes():
    counts = Counter()
    for route in app.routes:
        path = getattr(route, "path", "")
        for method in sorted(getattr(route, "methods", []) or []):
            counts[(method, path)] += 1
    return counts


def test_no_route_is_registered_twice():
    duplicates = {key: count for key, count in _registered_routes().items() if count > 1}
    assert duplicates == {}, f"shadowed routes are unreachable: {duplicates}"


def test_every_review_endpoint_survived_the_merge():
    """The merge must not have dropped a live endpoint along with the dead ones."""
    routes = _registered_routes()
    expected = [
        ("POST", "/api/products/{product_id}/reviews"),
        ("GET", "/api/products/{product_id}/reviews"),
        ("GET", "/api/products/{product_id}/reviews/my-review"),
        ("GET", "/api/products/{product_id}/reviews/summary"),
        ("PUT", "/api/reviews/{review_id}"),
        ("DELETE", "/api/reviews/{review_id}"),
        ("PATCH", "/api/admin/reviews/{review_id}"),
    ]
    for key in expected:
        assert routes[key] == 1, f"{key} should be registered exactly once"
