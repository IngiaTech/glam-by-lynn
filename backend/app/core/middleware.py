"""
Security middleware for FastAPI application
Handles security headers, rate limiting, and other security configurations
"""
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from typing import Dict, Optional
import logging
import time
from collections import defaultdict
from datetime import datetime, timedelta

from app.core.config import settings

logger = logging.getLogger(__name__)


def get_trusted_client_ip(request: Request) -> Optional[str]:
    """
    Resolve the client IP that rate-limit buckets are keyed on.

    Only values a client cannot set itself are trusted. Taking the first entry
    of X-Forwarded-For — the obvious reading — is exactly what makes a limiter
    useless: proxies *append* to XFF rather than replacing it, so a request
    carrying its own `X-Forwarded-For: 9.9.9.9` arrives as `9.9.9.9, <real ip>`
    and the leftmost value is whatever the attacker chose. Rotating it per
    request then yields a fresh bucket every time.

    Resolution order:

    1. ``CF-Connecting-IP`` — set by Cloudflare, which overwrites any value the
       client supplies. Render fronts every service with Cloudflare, so this is
       the authoritative source in the current deployment.
    2. The Nth entry from the right of ``X-Forwarded-For``, where N is
       ``TRUSTED_PROXY_HOPS`` — the value appended by our own proxies. Disabled
       by default (0), because trusting XFF without knowing the hop count is
       what created the bypass in the first place.
    3. The peer address, but only when no ``X-Forwarded-For`` is present at all
       (a direct connection, e.g. local development). Behind an untrusted proxy
       the peer is the proxy itself, and keying on it would put every visitor in
       one shared bucket.

    Returns None when no trustworthy identity is available. Callers must treat
    that as "do not limit" rather than lumping requests together — see the note
    in RateLimitMiddleware.dispatch.
    """
    cf_connecting_ip = request.headers.get("CF-Connecting-IP")
    if cf_connecting_ip and cf_connecting_ip.strip():
        return cf_connecting_ip.strip()

    forwarded = request.headers.get("X-Forwarded-For")
    hops = settings.TRUSTED_PROXY_HOPS

    if forwarded:
        if hops > 0:
            parts = [part.strip() for part in forwarded.split(",") if part.strip()]
            # Fewer entries than proxies means the chain isn't what we think it
            # is; refuse rather than trust a client-supplied value.
            if len(parts) >= hops:
                return parts[-hops]
        return None

    if request.client:
        return request.client.host

    return None


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add security headers to all responses

    Headers added:
    - X-Content-Type-Options: nosniff (prevents MIME sniffing)
    - X-Frame-Options: DENY (prevents clickjacking)
    - X-XSS-Protection: 1; mode=block (enables XSS filter)
    - Strict-Transport-Security: HSTS (enforces HTTPS)
    - Content-Security-Policy: CSP (prevents XSS and injection attacks)
    - Referrer-Policy: strict-origin-when-cross-origin
    - Permissions-Policy: restricts browser features
    """

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"

        # Enable XSS filter in older browsers
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Enforce HTTPS (only in production)
        if not request.url.hostname in ["localhost", "127.0.0.1"]:
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )

        # Content Security Policy
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self' https:; "
            "frame-ancestors 'none';"
        )

        # Referrer policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Permissions policy (restrict browser features)
        response.headers["Permissions-Policy"] = (
            "geolocation=(), microphone=(), camera=(), payment=()"
        )

        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Simple in-memory rate limiting middleware

    Limits requests per IP address to prevent brute force attacks.
    In production, use Redis or similar for distributed rate limiting.
    """

    def __init__(
        self,
        app: ASGIApp,
        requests_per_minute: int = 60,
        requests_per_hour: int = 1000,
    ):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.requests_per_hour = requests_per_hour
        self.request_counts: Dict[str, list] = defaultdict(list)
        self.cleanup_interval = 3600  # Clean up old entries every hour
        self.last_cleanup = time.time()
        self._last_untrusted_warning = 0.0

    def _get_client_ip(self, request: Request) -> Optional[str]:
        """Resolve the bucket key for this request; None when untrustworthy."""
        return get_trusted_client_ip(request)

    def _cleanup_old_requests(self):
        """Remove old request timestamps to prevent memory leaks."""
        current_time = time.time()
        if current_time - self.last_cleanup < self.cleanup_interval:
            return

        hour_ago = current_time - 3600
        for ip in list(self.request_counts.keys()):
            # Remove timestamps older than 1 hour
            self.request_counts[ip] = [
                ts for ts in self.request_counts[ip] if ts > hour_ago
            ]
            # Remove IP if no recent requests
            if not self.request_counts[ip]:
                del self.request_counts[ip]

        self.last_cleanup = current_time

    def _is_rate_limited(self, ip: str) -> tuple[bool, Optional[str]]:
        """
        Check if IP address is rate limited.

        Returns:
            Tuple of (is_limited, retry_after)
        """
        current_time = time.time()
        minute_ago = current_time - 60
        hour_ago = current_time - 3600

        # Get request timestamps for this IP
        timestamps = self.request_counts[ip]

        # Count requests in last minute
        recent_requests = [ts for ts in timestamps if ts > minute_ago]
        if len(recent_requests) >= self.requests_per_minute:
            # Rate limited - retry after 1 minute
            oldest_recent = min(recent_requests)
            retry_after = int(60 - (current_time - oldest_recent))
            return True, str(retry_after)

        # Count requests in last hour
        hourly_requests = [ts for ts in timestamps if ts > hour_ago]
        if len(hourly_requests) >= self.requests_per_hour:
            # Rate limited - retry after 1 hour
            oldest_hourly = min(hourly_requests)
            retry_after = int(3600 - (current_time - oldest_hourly))
            return True, str(retry_after)

        return False, None

    # Paths exempt from the general limiter: static media and health probes,
    # which are high-volume/benign and shouldn't consume a user's budget.
    _EXEMPT_PREFIXES = ("/uploads", "/health", "/docs", "/redoc", "/openapi.json")

    def _warn_untrusted_ip(self) -> None:
        """Warn that limiting is disabled, at most once a minute.

        This fires per request when misconfigured, so it is throttled to keep a
        misconfiguration from flooding the logs it needs to be visible in.
        """
        now = time.time()
        if now - self._last_untrusted_warning < 60:
            return
        self._last_untrusted_warning = now
        logger.warning(
            "Rate limiting skipped: no trusted client IP for this request. "
            "Expected CF-Connecting-IP (Render/Cloudflare) or TRUSTED_PROXY_HOPS "
            "set to match the proxy chain."
        )

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if path == "/" or path.startswith(self._EXEMPT_PREFIXES):
            return await call_next(request)

        # Cleanup old requests periodically
        self._cleanup_old_requests()

        # Get client IP
        client_ip = self._get_client_ip(request)

        # No trustworthy client identity. Fail open rather than key on a shared
        # value: behind a proxy the only alternative is the proxy's own address,
        # which would put every visitor in one bucket and 429 the whole site
        # once that bucket filled. Availability beats a limiter that is, in this
        # situation, already unenforceable.
        if client_ip is None:
            self._warn_untrusted_ip()
            return await call_next(request)

        # Check if IP is rate limited
        is_limited, retry_after = self._is_rate_limited(client_ip)

        if is_limited:
            return Response(
                content='{"detail": "Rate limit exceeded. Please try again later."}',
                status_code=429,
                media_type="application/json",
                headers={
                    "Retry-After": retry_after or "60",
                    "X-RateLimit-Limit": str(self.requests_per_minute),
                    "X-RateLimit-Remaining": "0",
                },
            )

        # Record this request
        current_time = time.time()
        self.request_counts[client_ip].append(current_time)

        # Process request
        response = await call_next(request)

        # Add rate limit headers to response
        minute_ago = current_time - 60
        recent_count = len(
            [ts for ts in self.request_counts[client_ip] if ts > minute_ago]
        )
        remaining = max(0, self.requests_per_minute - recent_count)

        response.headers["X-RateLimit-Limit"] = str(self.requests_per_minute)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(int(current_time + 60))

        return response


class AuthRateLimitMiddleware(BaseHTTPMiddleware):
    """
    Stricter rate limiting for authentication endpoints to prevent brute force attacks.

    Limits:
    - 5 requests per minute per IP
    - 20 requests per hour per IP
    """

    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.request_counts: Dict[str, list] = defaultdict(list)
        self.last_cleanup = time.time()
        self.requests_per_minute = 5
        self.requests_per_hour = 20

    def _get_client_ip(self, request: Request) -> Optional[str]:
        """Resolve the bucket key for this request; None when untrustworthy."""
        return get_trusted_client_ip(request)

    def _cleanup_old_requests(self):
        """Remove old request timestamps."""
        current_time = time.time()
        if current_time - self.last_cleanup < 3600:
            return

        hour_ago = current_time - 3600
        for ip in list(self.request_counts.keys()):
            self.request_counts[ip] = [
                ts for ts in self.request_counts[ip] if ts > hour_ago
            ]
            if not self.request_counts[ip]:
                del self.request_counts[ip]

        self.last_cleanup = current_time

    async def dispatch(self, request: Request, call_next):
        # Only apply to auth endpoints
        if not request.url.path.startswith("/api/auth"):
            return await call_next(request)

        self._cleanup_old_requests()

        client_ip = self._get_client_ip(request)
        if client_ip is None:
            # Same reasoning as the general limiter: a shared bucket here would
            # lock every customer out of signing in.
            logger.warning(
                "Auth rate limiting skipped: no trusted client IP. "
                "Set TRUSTED_PROXY_HOPS to match your proxy chain."
            )
            return await call_next(request)

        current_time = time.time()
        minute_ago = current_time - 60
        hour_ago = current_time - 3600

        timestamps = self.request_counts[client_ip]

        # Check minute limit
        recent_requests = [ts for ts in timestamps if ts > minute_ago]
        if len(recent_requests) >= self.requests_per_minute:
            oldest = min(recent_requests)
            retry_after = int(60 - (current_time - oldest))
            return Response(
                content='{"detail": "Too many authentication attempts. Please try again later."}',
                status_code=429,
                media_type="application/json",
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(self.requests_per_minute),
                    "X-RateLimit-Remaining": "0",
                },
            )

        # Check hour limit
        hourly_requests = [ts for ts in timestamps if ts > hour_ago]
        if len(hourly_requests) >= self.requests_per_hour:
            oldest = min(hourly_requests)
            retry_after = int(3600 - (current_time - oldest))
            return Response(
                content='{"detail": "Too many authentication attempts. Please try again later."}',
                status_code=429,
                media_type="application/json",
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(self.requests_per_hour),
                    "X-RateLimit-Remaining": "0",
                },
            )

        # Record request
        self.request_counts[client_ip].append(current_time)

        # Process request
        response = await call_next(request)

        # Add rate limit headers
        recent_count = len([ts for ts in timestamps if ts > minute_ago])
        remaining = max(0, self.requests_per_minute - recent_count)

        response.headers["X-RateLimit-Limit"] = str(self.requests_per_minute)
        response.headers["X-RateLimit-Remaining"] = str(remaining)

        return response
