/**
 * Guest (localStorage) cart helpers.
 *
 * Stores a denormalized snapshot of cart items in the same shape the backend
 * returns for authenticated users so the drawer/cart page/checkout page can
 * render either source without branching. The authenticated source of truth
 * is the backend; for guests this module is the source of truth.
 */

const STORAGE_KEY = "guestCart";

export interface GuestCartProduct {
  id: string;
  title: string;
  slug: string;
  basePrice: number;
  inventoryCount: number;
  images?: Array<{ imageUrl: string; altText?: string }>;
}

export interface GuestCartVariant {
  id: string;
  variantType: string;
  variantValue: string;
  priceAdjustment: number;
}

export interface GuestCartItem {
  id: string; // client-generated uuid
  productId: string;
  productVariantId?: string;
  quantity: number;
  product: GuestCartProduct;
  productVariant?: GuestCartVariant;
}

const isBrowser = () => typeof window !== "undefined";

function genId(): string {
  if (isBrowser() && typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getGuestCart(): GuestCartItem[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveGuestCart(items: GuestCartItem[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function getGuestCartCount(): number {
  return getGuestCart().reduce((sum, item) => sum + item.quantity, 0);
}

/**
 * Add a product to the guest cart. If a matching product/variant pair is
 * already present the quantity is summed; otherwise a new entry is created.
 * Returns the updated cart.
 */
export function addToGuestCart(
  product: GuestCartProduct,
  quantity: number = 1,
  variant?: GuestCartVariant,
): GuestCartItem[] {
  const items = getGuestCart();
  const variantId = variant?.id;

  const existing = items.find(
    (item) => item.productId === product.id && item.productVariantId === variantId,
  );

  if (existing) {
    existing.quantity = Math.min(
      existing.quantity + quantity,
      product.inventoryCount || Number.MAX_SAFE_INTEGER,
    );
  } else {
    items.push({
      id: genId(),
      productId: product.id,
      productVariantId: variantId,
      quantity: Math.min(quantity, product.inventoryCount || Number.MAX_SAFE_INTEGER),
      product,
      productVariant: variant,
    });
  }

  saveGuestCart(items);
  return items;
}

/**
 * Update the quantity of a specific guest cart line. Removes the item when
 * the new quantity drops below 1.
 */
export function updateGuestCartQuantity(
  itemId: string,
  quantity: number,
): GuestCartItem[] {
  let items = getGuestCart();
  if (quantity < 1) {
    items = items.filter((item) => item.id !== itemId);
  } else {
    items = items.map((item) =>
      item.id === itemId
        ? {
            ...item,
            quantity: Math.min(
              quantity,
              item.product.inventoryCount || Number.MAX_SAFE_INTEGER,
            ),
          }
        : item,
    );
  }
  saveGuestCart(items);
  return items;
}

export function removeFromGuestCart(itemId: string): GuestCartItem[] {
  const items = getGuestCart().filter((item) => item.id !== itemId);
  saveGuestCart(items);
  return items;
}

export function clearGuestCart(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}

/**
 * Convert the guest cart to the payload shape expected by POST /api/cart/merge
 * and the guest checkout flow in POST /api/orders.
 */
export function getGuestCartMergePayload(): Array<{
  productId: string;
  productVariantId?: string;
  quantity: number;
}> {
  return getGuestCart().map((item) => ({
    productId: item.productId,
    productVariantId: item.productVariantId,
    quantity: item.quantity,
  }));
}
