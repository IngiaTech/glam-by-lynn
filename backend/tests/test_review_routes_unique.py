"""One router owns reviews (Cut List: duplicate review routes).

Two routers used to declare POST and GET /api/products/{id}/reviews. FastAPI
matches whichever was registered first, so the later copies were unreachable —
a drift hazard rather than dead weight, since a fix applied to the shadowed
copy looks right in the source and does nothing at runtime. #227 found this the
hard way: the duplicated "helpful" endpoint had to be removed from both files
or the survivor would have silently taken over.

These assert against `app.openapi()` rather than walking `app.routes`. Newer
Starlette wraps included routers in `_IncludedRouter` objects instead of
flattening their routes into `app.routes`, and the wrapped routes carry
*relative* paths with the prefix applied at match time. A walk of `app.routes`
therefore finds no review routes at all on those versions — an earlier version
of this file did exactly that and passed CI vacuously, reporting "no
duplicates" because it had found nothing. The OpenAPI schema is public, stable
across versions, and describes what is actually served.
"""
from pathlib import Path

from app.main import app

REVIEW_OPERATIONS = [
    ("/api/products/{product_id}/reviews", "post"),
    ("/api/products/{product_id}/reviews", "get"),
    ("/api/products/{product_id}/reviews/my-review", "get"),
    ("/api/products/{product_id}/reviews/summary", "get"),
    ("/api/reviews/{review_id}", "put"),
    ("/api/reviews/{review_id}", "delete"),
    ("/api/admin/reviews/{review_id}", "patch"),
]


def test_every_review_endpoint_survived_the_merge():
    """Merging the routers must not have dropped a live endpoint."""
    paths = app.openapi()["paths"]

    for path, method in REVIEW_OPERATIONS:
        assert path in paths, f"{path} is no longer served"
        assert method in paths[path], f"{method.upper()} {path} is no longer served"


def test_the_shadowed_review_module_is_gone():
    """The duplicate declarations lived here; the file must not come back.

    This is the durable half of the guard. A generic "no route is registered
    twice" assertion can't be written against the public API — OpenAPI collapses
    duplicates into one key, and the route objects don't expose their mount
    prefix — so the check is made at the source instead.
    """
    shadowed = Path(__file__).resolve().parents[1] / "app" / "api" / "routes" / "reviews.py"
    assert not shadowed.exists(), (
        "app/api/routes/reviews.py is back; its review endpoints duplicate the "
        "ones in app/routers/reviews.py and would be shadowed at runtime"
    )


def test_review_endpoints_are_declared_in_exactly_one_module():
    """Guards the same property as above, for any future second declaration."""
    backend = Path(__file__).resolve().parents[1]
    declaring = []

    for module in (backend / "app").rglob("*.py"):
        if "__pycache__" in module.parts or "tests" in module.parts:
            continue
        source = module.read_text()
        if '"/products/{product_id}/reviews"' in source or '"/reviews/{review_id}"' in source:
            declaring.append(module.relative_to(backend).as_posix())

    assert declaring == ["app/routers/reviews.py"], (
        f"review routes should be declared in one module, found: {declaring}"
    )
