/**
 * Server-side protection for /admin (readiness finding H8).
 *
 * Without this, admin pages were guarded only in the browser: an anonymous
 * visitor received the admin JS bundle and was redirected client-side after it
 * loaded. Admin *data* was always safe — every admin API checks the caller's
 * Bearer token — but the admin UI's code and route structure were served to
 * anyone who asked.
 *
 * The first attempt (#212) used `withAuth` and was reverted in #213 because it
 * bounced legitimate admins to the sign-in page. The session data was correct
 * throughout; the proxy simply failed to *read* the cookie. `getToken` chooses
 * the cookie name from `NEXTAUTH_URL?.startsWith("https://") ?? VERCEL`, and an
 * `http://` NEXTAUTH_URL makes that `false` rather than undefined, so the
 * VERCEL fallback never applies. If the auth handler wrote the `__Secure-`
 * cookie but the reader looked for the plain one, a real admin decoded to null.
 *
 * This version is built so that failure mode cannot recur:
 *
 * - Both cookie names are tried. That weakens nothing: the value is an
 *   encrypted JWE that only NEXTAUTH_SECRET can produce, so reading either name
 *   still requires a token our own auth handler issued.
 * - No session cookie at all → definitely anonymous → sign-in. This is the case
 *   H8 exists for, and it's unambiguous: no admin lacks a cookie.
 * - A cookie that is present but can't be decoded → sign-in, like anonymous.
 *   An earlier draft let this through to avoid repeating #213, but local
 *   testing showed that made H8 trivially bypassable: sending
 *   `next-auth.session-token=anything` was enough to receive the admin
 *   bundle. Failing closed is safe now because #212's causes are fixed at
 *   source — Next 16 runs the proxy on the Node runtime with the same
 *   NEXTAUTH_SECRET as the session endpoint (#212 ran on Edge), and the
 *   cookie-name mismatch is handled above. An undecodable cookie is therefore
 *   an invalid session everywhere, and re-signing-in issues a fresh one.
 * - A decoded token that isn't an admin → home.
 *
 * Next.js 16 renamed `middleware.ts` to `proxy.ts`; the old name still runs but
 * is deprecated.
 */
import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const SESSION_COOKIES = [
  "__Secure-next-auth.session-token",
  "next-auth.session-token",
] as const;

/**
 * True if the request carries any NextAuth session cookie, including the
 * chunked form (`<name>.0`, `<name>.1`, …) used when the token exceeds 4 KB.
 */
function hasSessionCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some(({ name }) =>
      SESSION_COOKIES.some((base) => name === base || name.startsWith(`${base}.`))
    );
}

async function readToken(request: NextRequest) {
  const secret = process.env.NEXTAUTH_SECRET;

  // Try the name getToken would pick, then the other one. See the header
  // comment for why a mismatch between writer and reader is plausible.
  for (const secureCookie of [true, false]) {
    const token = await getToken({ req: request, secret, secureCookie });
    if (token) return token;
  }

  return null;
}

function redirectToSignIn(request: NextRequest) {
  const signIn = new URL("/auth/signin", request.url);
  // The sign-in page honours `redirect` (M9), restricted to same-origin paths.
  signIn.searchParams.set("redirect", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(signIn);
}

export async function proxy(request: NextRequest) {
  if (!hasSessionCookie(request)) {
    return redirectToSignIn(request);
  }

  const token = await readToken(request);

  if (!token) {
    // Logged so a real decode problem is visible rather than silent — this
    // path should only be reached by a forged or expired cookie.
    console.warn("[admin-proxy] session cookie could not be decoded; sending to sign-in");
    return redirectToSignIn(request);
  }

  if (token.isAdmin !== true) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
