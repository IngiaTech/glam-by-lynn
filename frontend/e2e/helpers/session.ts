/**
 * Real NextAuth sessions for end-to-end tests.
 *
 * Mints a genuine session cookie — the encrypted JWE NextAuth itself issues —
 * with the same NEXTAUTH_SECRET as the server under test, so the app's real
 * session endpoint decodes it and every client and server path runs for real.
 * No Google sign-in involved.
 *
 * `fixtures/auth.fixture.ts` predates this and writes a mock session to
 * localStorage, which NextAuth never reads; it can't produce a signed-in user.
 *
 * Requires NEXTAUTH_SECRET to be set to the value the server was started with.
 */
import type { BrowserContext } from "@playwright/test";
import { encode } from "next-auth/jwt";

/** The cookie name NextAuth uses over plain http (local runs). */
export const SESSION_COOKIE = "next-auth.session-token";

export interface SessionOptions {
  isAdmin?: boolean;
  /**
   * Mark the session as expired, exactly as the jwt callback does once the
   * backend refresh token has run out.
   */
  expired?: boolean;
}

export async function mintSessionCookie({ isAdmin = false, expired = false }: SessionOptions = {}) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET must be set to mint a session cookie");

  return encode({
    secret,
    token: {
      name: isAdmin ? "Test Admin" : "Test Customer",
      email: isAdmin ? "admin@glambylynn.com" : "customer@glambylynn.com",
      sub: "e2e-user",
      id: "e2e-user",
      isAdmin,
      adminRole: isAdmin ? "super_admin" : null,
      accessToken: "e2e-access-token",
      refreshToken: "e2e-refresh-token",
      // A recent lastRefresh stops the jwt callback trying to refresh against
      // the backend — which, with no backend running, would itself flag the
      // session as expired and make every "valid" session look expired.
      lastRefresh: Date.now(),
      ...(expired ? { error: "RefreshTokenError" } : {}),
    },
  });
}

export async function setSession(context: BrowserContext, baseURL: string, options?: SessionOptions) {
  await context.addCookies([
    { name: SESSION_COOKIE, value: await mintSessionCookie(options), url: baseURL },
  ]);
}

export async function hasSessionCookie(context: BrowserContext, baseURL: string) {
  return (await context.cookies(baseURL)).some(({ name }) => name === SESSION_COOKIE);
}
