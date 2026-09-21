/**
 * Detects an expired session anywhere in the app and ends it — sending the
 * user to the homepage, not the sign-in page.
 *
 * Mounted once, inside the session provider, so it covers every page — admin
 * pages included, which don't render the public Header that used to own this.
 *
 * Two signals mean the session has run out:
 *
 * 1. The session carries `error: "RefreshTokenError"`. The backend refresh
 *    token lasts seven days; after that the jwt callback can't mint a new
 *    access token and flags the session. This is the common case — a user
 *    returning after a week — and it's known as soon as the session loads, so
 *    it's acted on immediately rather than waiting for a poll.
 * 2. The access token is rejected by the API (401). Checked on mount and every
 *    five minutes, catching a token the backend revoked or that expired
 *    between refreshes.
 */
"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

import { API_BASE_URL, API_ENDPOINTS } from "@/config/api";
import { endExpiredSession } from "@/lib/sessionExpiry";

const FIRST_CHECK_DELAY_MS = 5_000;
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

export function SessionExpiryWatcher() {
  const { data: session, status } = useSession();

  const refreshFailed = session?.error === "RefreshTokenError";
  const accessToken = status === "authenticated" ? session?.accessToken : undefined;

  // Signal 1: the refresh token has expired.
  useEffect(() => {
    if (refreshFailed) endExpiredSession();
  }, [refreshFailed]);

  // Signal 2: the API rejects the access token.
  useEffect(() => {
    if (!accessToken || refreshFailed) return;

    // Leave the OAuth round-trip alone — the token may not be settled yet.
    if (window.location.pathname.startsWith("/auth/")) return;

    const check = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.ME}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (response.status === 401) endExpiredSession();
      } catch (error) {
        // A network failure says nothing about the session — the backend may
        // just be cold-starting. Never sign someone out over it.
        console.warn("[session] could not validate token (network error):", error);
      }
    };

    const firstCheck = setTimeout(check, FIRST_CHECK_DELAY_MS);
    const interval = setInterval(check, CHECK_INTERVAL_MS);

    return () => {
      clearTimeout(firstCheck);
      clearInterval(interval);
    };
  }, [accessToken, refreshFailed]);

  return null;
}
