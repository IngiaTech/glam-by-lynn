/**
 * Cross-component cart events.
 *
 * Kept in its own module so both `useCart` and `CartDrawer` can depend on
 * these helpers without forming a circular import.
 */

export const CART_DRAWER_EVENT = "cart-drawer:open";
export const CART_UPDATED_EVENT = "cart:updated";

export function openCartDrawer(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CART_DRAWER_EVENT));
}

export function notifyCartUpdated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT));
}
