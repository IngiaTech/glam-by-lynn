/**
 * Authentication hooks
 * Custom hooks for accessing auth state and user info
 */

"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { User as NextAuthUser } from "next-auth";
import {
  isAdmin,
  hasAdminRole,
  isSuperAdmin,
} from "@/lib/auth";

/**
 * Hook to access current user and auth state
 */
export function useAuth() {
  const { data: session, status } = useSession();
  const loading = status === "loading";

  // Check if we have a valid session with an access token.
  // If the session has no accessToken, or a refresh failed (error flag set),
  // consider it expired/invalid so the app forces re-authentication instead of
  // carrying a stale token that 401s every request.
  const hasValidToken = session?.accessToken != null && session?.error == null;
  const authenticated = status === "authenticated" && hasValidToken;

  // The session exists but its backend token can no longer be refreshed —
  // i.e. a signed-in user whose session has run out. SessionExpiryWatcher
  // signs them out and sends them home; guards should leave that to it.
  const expired = session?.error === "RefreshTokenError";

  const user = authenticated ? (session?.user as NextAuthUser | undefined) : undefined;

  return {
    user: user ?? null,
    session,
    loading,
    authenticated,
    expired,
    isAdmin: isAdmin(user),
    isSuperAdmin: isSuperAdmin(user),
    adminRole: user?.adminRole ?? null,
  };
}

/**
 * Hook to check if user has specific admin role
 */
export function useAdminRole(
  role: "super_admin" | "admin"
) {
  const { user } = useAuth();
  return hasAdminRole(user as NextAuthUser | null | undefined, role);
}

/**
 * Hook to require authentication
 * Returns user or null if not authenticated
 */
export function useRequireAuth() {
  const { user, loading, authenticated } = useAuth();

  return {
    user: authenticated ? user : null,
    loading,
    authenticated,
  };
}

/**
 * Hook to require admin access
 * Returns whether user is admin
 */
export function useRequireAdmin() {
  const { user, loading, authenticated } = useAuth();
  const admin = isAdmin(user as NextAuthUser | null | undefined);

  return {
    user: admin ? user : null,
    loading,
    authenticated,
    isAdmin: admin,
  };
}

/**
 * Keep signed-out visitors off a page that needs an account.
 *
 * Two different situations look the same here — "not authenticated" — and
 * need different destinations:
 *
 * - **Arrived signed out** (e.g. opened /orders from a bookmark, or clicked
 *   Wishlist while anonymous) → the sign-in page, returning here afterwards.
 * - **Signed in, then the session ended** — expired, or signed out from another
 *   tab → the homepage. They didn't ask to sign in; their session ran out.
 *
 * An expired session is left alone entirely: SessionExpiryWatcher is already
 * signing it out and navigating home, and redirecting here as well would race
 * it to a different destination.
 *
 * @param returnTo path to come back to after signing in, if any
 */
export function useRedirectWhenSignedOut(returnTo?: string) {
  const { authenticated, loading, expired } = useAuth();
  const router = useRouter();
  const wasAuthenticated = useRef(false);

  useEffect(() => {
    if (loading) return;

    if (authenticated) {
      wasAuthenticated.current = true;
      return;
    }

    if (expired) return;

    if (wasAuthenticated.current) {
      router.replace("/");
      return;
    }

    router.push(
      returnTo ? `/auth/signin?redirect=${encodeURIComponent(returnTo)}` : "/auth/signin"
    );
  }, [loading, authenticated, expired, returnTo, router]);

  return { authenticated, loading };
}
