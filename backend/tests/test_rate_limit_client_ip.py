"""Tests for trusted client-IP resolution in the rate limiters (finding H2).

The bug these guard against: proxies *append* to X-Forwarded-For rather than
replacing it, so the leftmost entry is whatever the caller chose. Keying rate
limits on it lets an attacker mint a fresh bucket per request and bypass both
limiters, including the 5/min auth limiter.
"""
from unittest.mock import patch

from app.core.middleware import get_trusted_client_ip


class _FakeClient:
    def __init__(self, host):
        self.host = host


class _FakeRequest:
    """Minimal stand-in exposing the attributes the resolver reads."""

    def __init__(self, headers=None, peer="10.0.0.1"):
        self.headers = headers or {}
        self.client = _FakeClient(peer) if peer else None


class TestCloudflareHeader:
    """Render fronts every service with Cloudflare, which sets this itself."""

    def test_cf_connecting_ip_is_trusted(self):
        request = _FakeRequest({"CF-Connecting-IP": "203.0.113.7"})
        assert get_trusted_client_ip(request) == "203.0.113.7"

    def test_cf_connecting_ip_wins_over_spoofed_forwarded_for(self):
        """The attacker's XFF must not override Cloudflare's own value."""
        request = _FakeRequest(
            {
                "CF-Connecting-IP": "203.0.113.7",
                "X-Forwarded-For": "9.9.9.9, 203.0.113.7",
            }
        )
        assert get_trusted_client_ip(request) == "203.0.113.7"

    def test_blank_cf_header_falls_through(self):
        request = _FakeRequest({"CF-Connecting-IP": "   "}, peer="10.0.0.1")
        # No XFF present, so the peer address is legitimate here.
        assert get_trusted_client_ip(request) == "10.0.0.1"


class TestForwardedForIsNotTrustedByDefault:
    def test_spoofed_forwarded_for_is_refused(self):
        """The core bypass: a client-supplied XFF must yield no identity."""
        with patch("app.core.middleware.settings.TRUSTED_PROXY_HOPS", 0):
            request = _FakeRequest({"X-Forwarded-For": "9.9.9.9"})
            assert get_trusted_client_ip(request) is None

    def test_rotating_forwarded_for_cannot_mint_buckets(self):
        """Each rotation must resolve to the same non-identity, not a new key."""
        with patch("app.core.middleware.settings.TRUSTED_PROXY_HOPS", 0):
            keys = {
                get_trusted_client_ip(_FakeRequest({"X-Forwarded-For": f"9.9.9.{n}"}))
                for n in range(1, 20)
            }
            assert keys == {None}

    def test_peer_is_not_used_when_behind_a_proxy(self):
        """Falling back to the proxy's address would bucket everyone together."""
        with patch("app.core.middleware.settings.TRUSTED_PROXY_HOPS", 0):
            request = _FakeRequest({"X-Forwarded-For": "9.9.9.9"}, peer="172.16.0.1")
            assert get_trusted_client_ip(request) is None

    def test_x_real_ip_is_no_longer_trusted(self):
        """X-Real-IP is equally client-settable; it used to be trusted outright."""
        with patch("app.core.middleware.settings.TRUSTED_PROXY_HOPS", 0):
            request = _FakeRequest({"X-Forwarded-For": "1.1.1.1", "X-Real-IP": "9.9.9.9"})
            assert get_trusted_client_ip(request) is None


class TestTrustedProxyHops:
    """Behind proxies we control (e.g. Docker on DO/AWS), count from the right."""

    def test_single_hop_takes_the_last_entry(self):
        with patch("app.core.middleware.settings.TRUSTED_PROXY_HOPS", 1):
            request = _FakeRequest({"X-Forwarded-For": "9.9.9.9, 203.0.113.7"})
            assert get_trusted_client_ip(request) == "203.0.113.7"

    def test_two_hops_takes_the_second_from_the_right(self):
        with patch("app.core.middleware.settings.TRUSTED_PROXY_HOPS", 2):
            request = _FakeRequest(
                {"X-Forwarded-For": "9.9.9.9, 203.0.113.7, 172.16.0.5"}
            )
            assert get_trusted_client_ip(request) == "203.0.113.7"

    def test_spoofing_cannot_shift_the_real_entry(self):
        """Extra attacker-prepended entries don't move the rightmost values."""
        with patch("app.core.middleware.settings.TRUSTED_PROXY_HOPS", 1):
            request = _FakeRequest(
                {"X-Forwarded-For": "1.1.1.1, 2.2.2.2, 3.3.3.3, 203.0.113.7"}
            )
            assert get_trusted_client_ip(request) == "203.0.113.7"

    def test_short_chain_is_refused(self):
        """Fewer entries than proxies means the chain isn't what we assume."""
        with patch("app.core.middleware.settings.TRUSTED_PROXY_HOPS", 2):
            request = _FakeRequest({"X-Forwarded-For": "203.0.113.7"})
            assert get_trusted_client_ip(request) is None

    def test_whitespace_and_empty_entries_are_ignored(self):
        with patch("app.core.middleware.settings.TRUSTED_PROXY_HOPS", 1):
            request = _FakeRequest({"X-Forwarded-For": " 9.9.9.9 ,  , 203.0.113.7 "})
            assert get_trusted_client_ip(request) == "203.0.113.7"


class TestDirectConnections:
    def test_peer_used_when_no_proxy_headers(self):
        """Local development and any direct connection."""
        request = _FakeRequest({}, peer="127.0.0.1")
        assert get_trusted_client_ip(request) == "127.0.0.1"

    def test_no_peer_and_no_headers_yields_none(self):
        request = _FakeRequest({}, peer=None)
        assert get_trusted_client_ip(request) is None


def _limited_app(requests_per_minute=5):
    """A minimal app with the real limiter attached.

    The shared `client` fixture strips the rate-limit middleware, so these
    tests build their own app — otherwise they would assert nothing.
    """
    from fastapi import FastAPI
    from fastapi.testclient import TestClient

    from app.core.middleware import AuthRateLimitMiddleware, RateLimitMiddleware

    app = FastAPI()

    @app.get("/api/products")
    def products():
        return {"ok": True}

    @app.post("/api/auth/google-login")
    def login():
        return {"ok": True}

    app.add_middleware(
        RateLimitMiddleware,
        requests_per_minute=requests_per_minute,
        requests_per_hour=1000,
    )
    app.add_middleware(AuthRateLimitMiddleware)

    return TestClient(app)


class TestLimiterStillLimits:
    """The limiter must keep working for identifiable clients."""

    def test_trusted_ip_is_limited(self):
        test_client = _limited_app(requests_per_minute=5)
        headers = {"CF-Connecting-IP": "203.0.113.7"}

        statuses = [
            test_client.get("/api/products", headers=headers).status_code
            for _ in range(8)
        ]

        assert 429 in statuses, "a trusted client should still hit the limit"

    def test_separate_trusted_ips_get_separate_buckets(self):
        test_client = _limited_app(requests_per_minute=5)

        for _ in range(6):
            test_client.get("/api/products", headers={"CF-Connecting-IP": "203.0.113.7"})

        other = test_client.get("/api/products", headers={"CF-Connecting-IP": "198.51.100.4"})
        assert other.status_code == 200

    def test_spoofed_forwarded_for_cannot_escape_the_bucket(self):
        """The bypass itself: same real client, rotating XFF, still one bucket."""
        test_client = _limited_app(requests_per_minute=5)

        statuses = [
            test_client.get(
                "/api/products",
                headers={
                    "CF-Connecting-IP": "203.0.113.7",
                    "X-Forwarded-For": f"9.9.9.{n}",
                },
            ).status_code
            for n in range(8)
        ]

        assert 429 in statuses

    def test_auth_limiter_blocks_a_trusted_client(self):
        test_client = _limited_app()
        headers = {"CF-Connecting-IP": "203.0.113.7"}

        statuses = [
            test_client.post("/api/auth/google-login", headers=headers).status_code
            for _ in range(8)
        ]

        assert 429 in statuses, "auth brute force must still be limited"


class TestLimiterFailsOpen:
    """A missing identity must skip limiting, never share one bucket."""

    def test_general_limiter_does_not_block_without_a_trusted_ip(self):
        """Sharing a bucket here would 429 every visitor at once — a worse
        failure than the unenforceable limiter it would replace."""
        with patch("app.core.middleware.settings.TRUSTED_PROXY_HOPS", 0):
            test_client = _limited_app(requests_per_minute=5)

            for n in range(12):
                response = test_client.get(
                    "/api/products", headers={"X-Forwarded-For": f"9.9.9.{n}"}
                )
                assert response.status_code == 200

    def test_auth_limiter_does_not_lock_everyone_out(self):
        with patch("app.core.middleware.settings.TRUSTED_PROXY_HOPS", 0):
            test_client = _limited_app()

            for n in range(12):
                response = test_client.post(
                    "/api/auth/google-login", headers={"X-Forwarded-For": f"9.9.9.{n}"}
                )
                assert response.status_code == 200
