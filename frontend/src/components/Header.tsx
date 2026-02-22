"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  ShoppingCart,
  User,
  Menu,
  LogOut,
  Package,
  Heart,
  Settings,
  Calendar,
} from "lucide-react";
import { API_BASE_URL, API_ENDPOINTS } from "@/config/api";

export function Header() {
  const { user, authenticated, isAdmin, session } = useAuth();
  const router = useRouter();
  const [cartItemCount, setCartItemCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Validate session token periodically
  useEffect(() => {
    if (!authenticated || !session?.accessToken) return;

    // Skip validation on auth pages to avoid interfering with OAuth flow
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/auth/')) {
      return;
    }

    const validateToken = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.ME}`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        });

        // If token is invalid (401), sign out the user
        if (res.status === 401) {
          console.log("[Header] Session token expired, signing out...");
          await signOut({ redirect: false });
          router.push("/auth/signin");
        }
      } catch (error) {
        // Silently catch network errors to avoid crashing the app
        // This can happen during SSR or when the backend is temporarily unavailable
        console.warn("[Header] Could not validate session (network error):", error);
      }
    };

    // Don't validate immediately to avoid SSR issues and OAuth interference
    // Wait 5 seconds after mount to ensure OAuth flow completes
    const initialTimeout = setTimeout(validateToken, 5000);

    // Then validate every 5 minutes
    const interval = setInterval(validateToken, 5 * 60 * 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [authenticated, session?.accessToken, router]);

  // Categories are no longer fetched globally to reduce API calls
  // They are now extracted from products on the products page
  // This ensures we only show categories that have products

  // Fetch cart count
  useEffect(() => {
    async function fetchCartCount() {
      if (!authenticated) {
        setCartItemCount(0);
        return;
      }
      try {
        const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CART.GET}`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          const count = data.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;
          setCartItemCount(count);
        }
      } catch (error) {
        console.error("Error fetching cart:", error);
      }
    }
    fetchCartCount();
  }, [authenticated]);

  return (
    <header className="sticky top-0 z-50 bg-black shadow-md shadow-black/20">
      <div className="container mx-auto px-4">
        {/* Main header */}
        <div className="flex items-center justify-between py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <img
              src="/glam-by-lynn-favicon.png"
              alt="Glam by Lynn"
              className="h-10 w-10"
            />
            <h1 className="text-xl font-bold md:text-2xl">
              <span className="text-white">Glam by </span>
              <span className="text-[#FFB6C1]">Lynn</span>
            </h1>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-6 lg:flex">
            <Link
              href="/"
              className="text-sm font-semibold text-white transition-colors hover:text-[#FFB6C1] px-3 py-1.5 rounded-md hover:bg-[#FFB6C1]/10"
            >
              Home
            </Link>
            <Link
              href="/services"
              className="text-sm font-semibold text-white transition-colors hover:text-[#FFB6C1] px-3 py-1.5 rounded-md hover:bg-[#FFB6C1]/10"
            >
              Services
            </Link>
            <Link
              href="/classes"
              className="text-sm font-semibold text-white transition-colors hover:text-[#FFB6C1] px-3 py-1.5 rounded-md hover:bg-[#FFB6C1]/10"
            >
              Classes
            </Link>
            <Link
              href="/products"
              className="text-sm font-semibold text-white transition-colors hover:text-[#FFB6C1] px-3 py-1.5 rounded-md hover:bg-[#FFB6C1]/10"
            >
              Products
            </Link>

            <Link
              href="/gallery"
              className="text-sm font-semibold text-white transition-colors hover:text-[#FFB6C1] px-3 py-1.5 rounded-md hover:bg-[#FFB6C1]/10"
            >
              Gallery
            </Link>
            <Link
              href="/vision-2026"
              className="flex items-center gap-1.5 text-sm font-semibold text-white transition-colors hover:text-[#FFB6C1] px-3 py-1.5 rounded-md hover:bg-[#FFB6C1]/10"
            >
              Vision 2026
              <Badge className="text-xs bg-vision-gradient text-white border-0">New</Badge>
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className="text-sm font-semibold text-[#FFB6C1] transition-colors hover:text-[#FF69B4] px-3 py-1.5 rounded-md hover:bg-[#FFB6C1]/10"
              >
                Admin
              </Link>
            )}
          </nav>

          {/* Cart, User Menu */}
          <div className="flex items-center gap-3">
            {/* Cart Icon */}
            <Button variant="ghost" size="icon" asChild className="relative text-white hover:text-[#FFB6C1] hover:bg-[#FFB6C1]/10">
              <Link href="/cart">
                <ShoppingCart className="h-5 w-5" />
                {cartItemCount > 0 && (
                  <Badge
                    className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs bg-pink-gradient text-white border-0"
                  >
                    {cartItemCount > 9 ? "9+" : cartItemCount}
                  </Badge>
                )}
              </Link>
            </Button>

            {/* User Menu */}
            {authenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-white hover:text-[#FFB6C1] hover:bg-[#FFB6C1]/10">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user?.name || "User"}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/orders" className="cursor-pointer">
                      <Package className="mr-2 h-4 w-4" />
                      My Orders
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/bookings" className="cursor-pointer">
                      <Calendar className="mr-2 h-4 w-4" />
                      My Bookings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/wishlist" className="cursor-pointer">
                      <Heart className="mr-2 h-4 w-4" />
                      Wishlist
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/account" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      Account Settings
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/admin" className="cursor-pointer text-secondary">
                          <Settings className="mr-2 h-4 w-4" />
                          Admin Dashboard
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-red-600"
                    onClick={() => signOut()}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild size="sm" className="bg-pink-gradient hover:opacity-90 text-white border-0">
                <Link href="/auth/signin">Sign In</Link>
              </Button>
            )}

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden text-white hover:text-[#FFB6C1] hover:bg-[#FFB6C1]/10">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <img
                      src="/glam-by-lynn-favicon.png"
                      alt="Glam by Lynn"
                      className="h-6 w-6"
                    />
                    <span>
                      <span className="text-foreground">Glam by </span>
                      <span className="text-secondary">Lynn</span>
                    </span>
                  </SheetTitle>
                </SheetHeader>

                {/* Mobile Navigation */}
                <nav className="flex flex-col gap-4">
                  <Link
                    href="/"
                    className="text-sm font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Home
                  </Link>
                  <Link
                    href="/services"
                    className="text-sm font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Services
                  </Link>
                  <Link
                    href="/classes"
                    className="text-sm font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Classes
                  </Link>
                  <Link
                    href="/products"
                    className="text-sm font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Products
                  </Link>

                  <Link
                    href="/gallery"
                    className="text-sm font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Gallery
                  </Link>

                  <Link
                    href="/vision-2026"
                    className="flex items-center gap-2 text-sm font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Vision 2026
                    <Badge variant="secondary" className="text-xs">New</Badge>
                  </Link>

                  {authenticated && (
                    <>
                      <hr className="my-2" />
                      <Link
                        href="/orders"
                        className="text-sm font-medium"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        My Orders
                      </Link>
                      <Link
                        href="/bookings"
                        className="text-sm font-medium"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        My Bookings
                      </Link>
                      <Link
                        href="/wishlist"
                        className="text-sm font-medium"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Wishlist
                      </Link>
                    </>
                  )}

                  {isAdmin && (
                    <>
                      <hr className="my-2" />
                      <Link
                        href="/admin"
                        className="text-sm font-medium text-secondary"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Admin Dashboard
                      </Link>
                    </>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
