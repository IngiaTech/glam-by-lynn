/**
 * Shared contact-field validation for the booking and checkout flows.
 *
 * Loose enough on email to accept anything recognisably an address (a single @
 * with a TLD-looking right-hand side) — we're after "typo-free enough to reach
 * the customer", not RFC compliance. Phone targets Kenyan mobiles.
 */

// Single @ with a dotted, 2+ char TLD on the right.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Kenyan mobile: +254 7XX/1XX XXX XXX, or 07XX/01XX XXX XXX.
const PHONE_RE = /^(?:\+?254|0)(?:7|1)\d{8}$/;

/** Strip spaces/dashes so formatted input still validates. */
export const normalizePhone = (s: string): string => s.replace(/[\s-]/g, "");

export const isValidEmail = (s: string): boolean => EMAIL_RE.test(s.trim());

export const isValidPhone = (s: string): boolean =>
  PHONE_RE.test(normalizePhone(s));
