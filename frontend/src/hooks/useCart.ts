/**
 * Unified cart hook that works for both guest (localStorage) and
 * authenticated (backend) users.
 *
 * Responsibilities:
 * - Expose a single `items`/`count` state regardless of source
 * - Route writes to the correct backend (API or localStorage)
 * - Emit the existing CART_UPDATED_EVENT so the header badge and open
 *   cart drawer stay in sync
 * - On the auth state transition from guest → signed-in, automatically
 *   merge any localStorage cart into the user's backend cart and clear
 *   the local storage.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { API_BASE_URL, API_ENDPOINTS } from "@/config/api";
import { notifyCartUpdated } from "@/lib/cartEvents";
import {
  addToGuestCart,
  clearGuestCart,
  getGuestCart,
  getGuestCartMergePayload,
  removeFromGuestCart,
  updateGuestCartQuantity,
  type GuestCartItem,
  type GuestCartProduct,
  type GuestCartVariant,
} from "@/lib/guestCart";

export type CartItem = GuestCartItem;

export interface UseCart {
  items: CartItem[];
  count: number;
  loading: boolean;
  addItem: (
    product: GuestCartProduct,
    quantity?: number,
    variant?: GuestCartVariant,
  ) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refresh: () => Promise<void>;
}

function mapBackendItems(raw: any): CartItem[] {
  if (!raw?.items || !Array.isArray(raw.items)) return [];
  return raw.items.map((item: any) => ({
    id: item.id,
    productId: item.productId,
    productVariantId: item.productVariantId ?? undefined,
    quantity: item.quantity,
    product: {
      id: item.product?.id,
      title: item.product?.title,
      slug: item.product?.slug,
      basePrice: Number(item.product?.basePrice ?? 0),
      inventoryCount: item.product?.inventoryCount ?? 0,
      images: item.product?.images ?? [],
    },
    productVariant: item.productVariant
      ? {
          id: item.productVariant.id,
          variantType: item.productVariant.variantType,
          variantValue: item.productVariant.variantValue,
          priceAdjustment: Number(item.productVariant.priceAdjustment ?? 0),
        }
      : undefined,
  }));
}

export function useCart(): UseCart {
  const { authenticated, session } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Track the last auth state we saw so we can detect the guest → user
  // transition and trigger the merge exactly once per sign-in.
  const prevAuthRef = useRef<boolean | null>(null);

  // Track whether we've done the initial load. After that, subsequent
  // refreshes should NOT show the loading spinner (they happen after
  // mutations and the UI has per-item spinners for that).
  const initialLoadDone = useRef(false);

  const refresh = useCallback(async () => {
    if (authenticated && session?.accessToken) {
      if (!initialLoadDone.current) setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CART.GET}`, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setItems(mapBackendItems(data));
        } else {
          setItems([]);
        }
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
        initialLoadDone.current = true;
      }
    } else {
      setItems(getGuestCart());
      initialLoadDone.current = true;
    }
  }, [authenticated, session?.accessToken]);

  // Initial load + react to auth state changes
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Keep in sync with storage changes from other tabs.
  // We do NOT listen to cart:updated here because this hook already
  // calls refresh() internally after every mutation. Listening to its
  // own dispatched events would cause a redundant double-fetch.
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "guestCart" || e.key === null) refresh();
    };
    window.addEventListener("storage", handleStorage as any);
    return () => window.removeEventListener("storage", handleStorage as any);
  }, [refresh]);

  // Merge guest cart on sign-in transition
  useEffect(() => {
    const prev = prevAuthRef.current;
    prevAuthRef.current = authenticated;

    // First render — nothing to merge yet
    if (prev === null) return;

    // Only act on the guest → authenticated transition
    if (!prev && authenticated && session?.accessToken) {
      const payload = getGuestCartMergePayload();
      if (payload.length === 0) return;

      (async () => {
        try {
          const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CART.MERGE}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.accessToken}`,
            },
            body: JSON.stringify({ items: payload }),
          });
          if (res.ok) {
            const data = await res.json();
            clearGuestCart();
            if (data.warnings?.length > 0) {
              toast.info(
                `Some items couldn't be added to your bag: ${data.warnings.join(", ")}`,
              );
            } else if (data.merged > 0) {
              toast.success("Your bag is ready");
            }
            await refresh();
            notifyCartUpdated();
          }
        } catch {
          // Non-fatal: keep the guest cart in localStorage so the user
          // doesn't lose it. They can retry on next sign-in.
        }
      })();
    }
  }, [authenticated, session?.accessToken, refresh]);

  const addItem = useCallback(
    async (
      product: GuestCartProduct,
      quantity: number = 1,
      variant?: GuestCartVariant,
    ) => {
      if (authenticated && session?.accessToken) {
        try {
          const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CART.ADD_ITEM}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.accessToken}`,
            },
            body: JSON.stringify({
              productId: product.id,
              productVariantId: variant?.id,
              quantity,
            }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || "Failed to add to bag");
          }
          await refresh();
          notifyCartUpdated();
        } catch (e) {
          throw e;
        }
      } else {
        addToGuestCart(product, quantity, variant);
        setItems(getGuestCart());
        notifyCartUpdated();
      }
    },
    [authenticated, session?.accessToken, refresh],
  );

  const updateQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      if (authenticated && session?.accessToken) {
        try {
          if (quantity < 1) {
            await fetch(
              `${API_BASE_URL}${API_ENDPOINTS.CART.REMOVE_ITEM(itemId)}`,
              {
                method: "DELETE",
                headers: { Authorization: `Bearer ${session.accessToken}` },
              },
            );
          } else {
            await fetch(
              `${API_BASE_URL}${API_ENDPOINTS.CART.UPDATE_ITEM(itemId)}`,
              {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${session.accessToken}`,
                },
                body: JSON.stringify({ quantity }),
              },
            );
          }
          await refresh();
          notifyCartUpdated();
        } catch {
          toast.error("Failed to update quantity");
        }
      } else {
        updateGuestCartQuantity(itemId, quantity);
        setItems(getGuestCart());
        notifyCartUpdated();
      }
    },
    [authenticated, session?.accessToken, refresh],
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      if (authenticated && session?.accessToken) {
        try {
          await fetch(
            `${API_BASE_URL}${API_ENDPOINTS.CART.REMOVE_ITEM(itemId)}`,
            {
              method: "DELETE",
              headers: { Authorization: `Bearer ${session.accessToken}` },
            },
          );
          await refresh();
          notifyCartUpdated();
        } catch {
          toast.error("Failed to remove item");
        }
      } else {
        removeFromGuestCart(itemId);
        setItems(getGuestCart());
        notifyCartUpdated();
      }
    },
    [authenticated, session?.accessToken, refresh],
  );

  const clearCart = useCallback(async () => {
    if (authenticated && session?.accessToken) {
      try {
        await fetch(`${API_BASE_URL}${API_ENDPOINTS.CART.CLEAR}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${session.accessToken}` },
        });
        setItems([]);
        notifyCartUpdated();
      } catch {
        toast.error("Failed to clear bag");
      }
    } else {
      clearGuestCart();
      setItems([]);
      notifyCartUpdated();
    }
  }, [authenticated, session?.accessToken]);

  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    items,
    count,
    loading,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    refresh,
  };
}
