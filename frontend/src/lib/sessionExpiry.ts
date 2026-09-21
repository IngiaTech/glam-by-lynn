/**
 * Ending a session that has expired.
 *
 * When a signed-in user's session expires they go to the homepage, not the
 * sign-in page — they didn't ask to sign in, the session simply ran out.
 * (Someone who *arrives* signed out at a page that needs an account is still
 * sent to sign-in; see useRedirectWhenSignedOut.)
 *
 * Expiry is detected in more than one place — the session's refresh-failure
 * flag, a 401 from the periodic token check, a 401 from a page's own data
 * fetch — so this is the single exit they all share.
 */
import { signOut } from "next-auth/react";

let ending = false;

/**
 * Sign the user out and send them to the homepage.
 *
 * Idempotent: several detectors can fire for the same expiry (the refresh flag
 * and a 401 often arrive together), and a second signOut racing the first
 * would be wasted at best.
 *
 * `signOut` with a callbackUrl performs a full navigation, so the page the user
 * was on unloads before its own guards can react to the signed-out state and
 * redirect somewhere else.
 */
export function endExpiredSession(): void {
  if (ending) return;
  ending = true;
  void signOut({ callbackUrl: "/" });
}

/** For tests: allow endExpiredSession to fire again. */
export function resetSessionExpiryForTests(): void {
  ending = false;
}
