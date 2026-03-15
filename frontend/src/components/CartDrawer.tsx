"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ShoppingBag,
  Minus,
  Plus,
  X,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { API_BASE_URL, API_ENDPOINTS } from "@/config/api";
import { resolveImageUrl } from "@/lib/utils";

interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  productVariantId?: string;
  quantity: number;
  product: {
    id: string;
    title: string;
    slug: string;
    basePrice: number;
    images?: Array<{ imageUrl: string; altText?: string }>;
    inventoryCount: number;
  };
  productVariant?: {
    id: string;
    variantType: string;
    variantValue: string;
    priceAdjustment: number;
  };
}

// Custom event for opening the cart drawer
export const CART_DRAWER_EVENT = "cart-drawer:open";
export const CART_UPDATED_EVENT = "cart:updated";

export function openCartDrawer() {
  window.dispatchEvent(new CustomEvent(CART_DRAWER_EVENT));
}

export function notifyCartUpdated() {
  window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT));
}

export function CartDrawer() {
  const { authenticated, session } = useAuth();
  const [open, setOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());
  const [removingItems, setRemovingItems] = useState<Set<string>>(new Set());

  const fetchCart = useCallback(async () => {
    if (!authenticated || !session?.accessToken) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CART.GET}`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCartItems(data.items || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [authenticated, session?.accessToken]);

  // Listen for open events
  useEffect(() => {
    const handleOpen = () => {
      setOpen(true);
      fetchCart();
    };
    const handleCartUpdated = () => {
      if (open) fetchCart();
    };
    window.addEventListener(CART_DRAWER_EVENT, handleOpen);
    window.addEventListener(CART_UPDATED_EVENT, handleCartUpdated);
    return () => {
      window.removeEventListener(CART_DRAWER_EVENT, handleOpen);
      window.removeEventListener(CART_UPDATED_EVENT, handleCartUpdated);
    };
  }, [fetchCart, open]);

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    setUpdatingItems((prev) => new Set(prev).add(itemId));
    try {
      if (newQuantity < 1) {
        await fetch(`${API_BASE_URL}${API_ENDPOINTS.CART.REMOVE_ITEM(itemId)}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${session?.accessToken}` },
        });
      } else {
        await fetch(`${API_BASE_URL}${API_ENDPOINTS.CART.UPDATE_ITEM(itemId)}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.accessToken}`,
          },
          body: JSON.stringify({ quantity: newQuantity }),
        });
      }
      await fetchCart();
      notifyCartUpdated();
    } catch {
      toast.error("Failed to update quantity");
    } finally {
      setUpdatingItems((prev) => {
        const s = new Set(prev);
        s.delete(itemId);
        return s;
      });
    }
  };

  const removeItem = async (itemId: string) => {
    setRemovingItems((prev) => new Set(prev).add(itemId));
    try {
      await fetch(`${API_BASE_URL}${API_ENDPOINTS.CART.REMOVE_ITEM(itemId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      await fetchCart();
      notifyCartUpdated();
    } catch {
      toast.error("Failed to remove item");
    } finally {
      setRemovingItems((prev) => {
        const s = new Set(prev);
        s.delete(itemId);
        return s;
      });
    }
  };

  const getItemPrice = (item: CartItem) => {
    return Number(item.product.basePrice) + Number(item.productVariant?.priceAdjustment || 0);
  };

  const subtotal = cartItems.reduce((sum, item) => sum + getItemPrice(item) * item.quantity, 0);
  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md bg-[#fdfafc] p-0">
        {/* Header */}
        <SheetHeader className="border-b border-pink-100 px-6 py-4">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <ShoppingBag className="h-5 w-5 text-pink-500" />
            Your Bag
            {totalQuantity > 0 && (
              <span className="ml-1 text-sm font-normal text-gray-400">
                ({totalQuantity} {totalQuantity === 1 ? "item" : "items"})
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-pink-400" />
            </div>
          ) : cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ShoppingBag className="mb-4 h-12 w-12 text-gray-200" />
              <p className="text-sm font-medium text-gray-500">Your bag is empty</p>
              <p className="mt-1 text-xs text-gray-400">Add some products to get started</p>
              <Button
                className="mt-6 rounded-2xl bg-pink-500 hover:bg-pink-600"
                onClick={() => setOpen(false)}
                asChild
              >
                <Link href="/products">
                  Browse Products
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 rounded-2xl border border-pink-50 bg-white p-3"
                >
                  {/* Image */}
                  <Link
                    href={`/products/${item.product.id}`}
                    onClick={() => setOpen(false)}
                    className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-gray-50"
                  >
                    {item.product.images?.[0] ? (
                      <Image
                        src={resolveImageUrl(item.product.images[0].imageUrl)}
                        alt={item.product.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ShoppingBag className="h-6 w-6 text-gray-200" />
                      </div>
                    )}
                  </Link>

                  {/* Info */}
                  <div className="flex flex-1 flex-col min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/products/${item.product.id}`}
                          onClick={() => setOpen(false)}
                          className="text-sm font-bold text-[#1a0f1c] line-clamp-1 hover:text-pink-600 transition-colors"
                        >
                          {item.product.title}
                        </Link>
                        {item.productVariant && (
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {item.productVariant.variantType}: {item.productVariant.variantValue}
                          </p>
                        )}
                        <p className="text-sm font-black text-[#1a0f1c] mt-1">
                          KSh {getItemPrice(item).toLocaleString()}
                        </p>
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() => removeItem(item.id)}
                        disabled={removingItems.has(item.id)}
                        className="flex-shrink-0 rounded-full p-1 text-gray-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                      >
                        {removingItems.has(item.id) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    {/* Quantity */}
                    <div className="mt-2 flex items-center">
                      <div className="inline-flex items-center rounded-xl border border-pink-200 bg-pink-50 overflow-hidden">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={updatingItems.has(item.id)}
                          className="flex items-center justify-center px-2.5 py-1.5 text-pink-700 hover:bg-pink-100 transition-colors disabled:opacity-50"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <div className="flex items-center justify-center px-3 py-1.5 border-x border-pink-200 min-w-[2rem] text-center">
                          {updatingItems.has(item.id) ? (
                            <Loader2 className="h-3 w-3 animate-spin text-pink-600" />
                          ) : (
                            <span className="text-xs font-bold text-pink-800">{item.quantity}</span>
                          )}
                        </div>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={updatingItems.has(item.id) || item.quantity >= item.product.inventoryCount}
                          className="flex items-center justify-center px-2.5 py-1.5 text-pink-700 hover:bg-pink-100 transition-colors disabled:opacity-50"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="ml-auto text-sm font-bold text-[#1a0f1c]">
                        KSh {(getItemPrice(item) * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="border-t border-pink-100 px-6 py-4 space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-bold text-[#1a0f1c]">KSh {subtotal.toLocaleString()}</span>
            </div>
            <p className="text-[10px] text-gray-400">Shipping calculated at checkout</p>

            <Button
              className="w-full rounded-2xl bg-pink-500 py-6 text-sm font-bold hover:bg-pink-600 active:scale-95 transition-all"
              asChild
              onClick={() => setOpen(false)}
            >
              <Link href="/checkout">
                Checkout
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>

            <Button
              variant="outline"
              className="w-full rounded-2xl py-6 text-sm font-bold border-pink-200 text-pink-600 hover:bg-pink-50"
              onClick={() => setOpen(false)}
            >
              Continue Shopping
            </Button>

            {subtotal < 5000 && (
              <p className="text-center text-[10px] text-gray-400">
                Add KSh {(5000 - subtotal).toLocaleString()} more for free shipping
              </p>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
