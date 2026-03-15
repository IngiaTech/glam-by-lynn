/**
 * Products Catalog Page
 * Premium "Luxury Glam" UI with glassmorphism, clickable cards, and mobile-first filtering
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  X,
  Search,
  SlidersHorizontal,
  ShoppingBag,
  Heart,
  Eye,
  Bell,
  Loader2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
} from "lucide-react";
import { getProducts, type ProductFilters } from "@/lib/products";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { API_BASE_URL, API_ENDPOINTS } from "@/config/api";
import { resolveImageUrl } from "@/lib/utils";
import type { Product, Brand, Category } from "@/types";

export default function ProductsPage() {
  const router = useRouter();
  const { authenticated, session } = useAuth();

  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Cart / wishlist interaction
  const [addingToCartId, setAddingToCartId] = useState<string | null>(null);
  const [cartMap, setCartMap] = useState<Map<string, { cartItemId: string; quantity: number }>>(new Map());
  const [updatingCartId, setUpdatingCartId] = useState<string | null>(null);
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [togglingWishlistId, setTogglingWishlistId] = useState<string | null>(null);

  // Local search query (client-side filtering)
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Filter state
  const [filters, setFilters] = useState<ProductFilters>({
    page: 1,
    pageSize: 20,
    sortBy: "created_at",
    sortOrder: "desc",
    inStockOnly: false,
  });

  // Pagination state
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  // Price range state
  const [priceMin, setPriceMin] = useState<string>("");
  const [priceMax, setPriceMax] = useState<string>("");

  // Fetch products whenever filters change
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const data = await getProducts(filters);
        setProducts(data.items);
        setTotalPages(data.total_pages);
        setTotalProducts(data.total);

        const uniqueBrands = new Map<string, Brand>();
        const uniqueCategories = new Map<string, Category>();

        data.items.forEach((product) => {
          if (product.brand && !uniqueBrands.has(product.brand.id)) {
            uniqueBrands.set(product.brand.id, product.brand);
          }
          if (product.category && !uniqueCategories.has(product.category.id)) {
            uniqueCategories.set(product.category.id, product.category);
          }
        });

        setBrands(Array.from(uniqueBrands.values()));
        setCategories(Array.from(uniqueCategories.values()));
      } catch (error) {
        console.error("Error fetching products:", error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [filters]);

  // Load wishlist and cart for authenticated users
  const loadCart = useCallback(async () => {
    if (!authenticated || !session?.accessToken) return;
    try {
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CART.GET}`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        const map = new Map<string, { cartItemId: string; quantity: number }>();
        for (const item of data.items || []) {
          map.set(item.productId, { cartItemId: item.id, quantity: item.quantity });
        }
        setCartMap(map);
      }
    } catch { /* silently fail */ }
  }, [authenticated, session?.accessToken]);

  useEffect(() => {
    const loadWishlist = async () => {
      if (!authenticated || !session?.accessToken) return;
      try {
        const res = await fetch(`${API_BASE_URL}/wishlist`, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        });
        if (res.ok) {
          const items = await res.json();
          setWishlistIds(new Set(items.map((item: any) => item.productId)));
        }
      } catch { /* silently fail */ }
    };
    loadWishlist();
    loadCart();
  }, [authenticated, session?.accessToken, loadCart]);

  const updateFilter = (key: keyof ProductFilters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: key === "page" ? value : 1,
    }));
  };

  const applyPriceFilter = () => {
    setFilters((prev) => ({
      ...prev,
      minPrice: priceMin ? parseFloat(priceMin) : undefined,
      maxPrice: priceMax ? parseFloat(priceMax) : undefined,
      page: 1,
    }));
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
      pageSize: 20,
      sortBy: "created_at",
      sortOrder: "desc",
      inStockOnly: false,
    });
    setPriceMin("");
    setPriceMax("");
    setSearchQuery("");
  };

  const filteredProducts = products.filter((product) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      product.title.toLowerCase().includes(query) ||
      product.description?.toLowerCase().includes(query) ||
      product.brand?.name.toLowerCase().includes(query) ||
      product.category?.name.toLowerCase().includes(query)
    );
  });

  const hasActiveFilters =
    filters.brandId ||
    filters.categoryId ||
    searchQuery ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined;

  const getActiveFilters = () => {
    const active: { key: string; label: string; value: string }[] = [];
    if (filters.brandId) {
      const brand = brands.find((b) => b.id === filters.brandId);
      if (brand) active.push({ key: "brandId", label: "Brand", value: brand.name });
    }
    if (filters.categoryId) {
      const category = categories.find((c) => c.id === filters.categoryId);
      if (category) active.push({ key: "categoryId", label: "Category", value: category.name });
    }
    if (searchQuery) {
      active.push({ key: "search", label: "Search", value: searchQuery });
    }
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      const min = filters.minPrice !== undefined ? `KSh ${filters.minPrice}` : "0";
      const max = filters.maxPrice !== undefined ? `KSh ${filters.maxPrice}` : "\u221e";
      active.push({ key: "price", label: "Price", value: `${min} - ${max}` });
    }
    return active;
  };

  const removeFilter = (key: string) => {
    if (key === "price") {
      setPriceMin("");
      setPriceMax("");
      setFilters((prev) => ({ ...prev, minPrice: undefined, maxPrice: undefined, page: 1 }));
    } else if (key === "search") {
      setSearchQuery("");
    } else {
      setFilters((prev) => ({ ...prev, [key]: undefined, page: 1 }));
    }
  };

  // Cart handler
  const handleAddToCart = useCallback(async (product: Product) => {
    if (!authenticated) {
      router.push(`/auth/signin?redirect=/products`);
      return;
    }
    setAddingToCartId(product.id);
    try {
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CART.ADD_ITEM}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({ productId: product.id, quantity: 1 }),
      });
      if (res.ok) {
        toast.success(`${product.title} added to bag`);
        await loadCart();
      } else {
        const err = await res.json();
        toast.error(err.detail || "Failed to add to bag");
      }
    } catch {
      toast.error("Failed to add to bag");
    } finally {
      setAddingToCartId(null);
    }
  }, [authenticated, session?.accessToken, router, loadCart]);

  // Cart quantity update handler
  const handleUpdateQuantity = useCallback(async (productId: string, delta: number) => {
    const entry = cartMap.get(productId);
    if (!entry) return;
    const newQty = entry.quantity + delta;
    setUpdatingCartId(productId);
    try {
      if (newQty < 1) {
        // Remove item
        await fetch(`${API_BASE_URL}${API_ENDPOINTS.CART.REMOVE_ITEM(entry.cartItemId)}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${session?.accessToken}` },
        });
      } else {
        await fetch(`${API_BASE_URL}${API_ENDPOINTS.CART.UPDATE_ITEM(entry.cartItemId)}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.accessToken}`,
          },
          body: JSON.stringify({ quantity: newQty }),
        });
      }
      await loadCart();
    } catch {
      toast.error("Failed to update quantity");
    } finally {
      setUpdatingCartId(null);
    }
  }, [cartMap, session?.accessToken, loadCart]);

  // Wishlist handler
  const handleToggleWishlist = useCallback(async (product: Product) => {
    if (!authenticated) {
      router.push(`/auth/signin?redirect=/products`);
      return;
    }
    const isInWishlist = wishlistIds.has(product.id);
    setTogglingWishlistId(product.id);
    try {
      if (isInWishlist) {
        const res = await fetch(`${API_BASE_URL}/wishlist/${product.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${session?.accessToken}` },
        });
        if (res.ok) {
          setWishlistIds((prev) => { const next = new Set(prev); next.delete(product.id); return next; });
          toast.success("Removed from wishlist");
        }
      } else {
        const res = await fetch(`${API_BASE_URL}/wishlist`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.accessToken}`,
          },
          body: JSON.stringify({ productId: product.id }),
        });
        if (res.ok) {
          setWishlistIds((prev) => new Set(prev).add(product.id));
          toast.success("Added to wishlist!");
        }
      }
    } catch {
      toast.error("Failed to update wishlist");
    } finally {
      setTogglingWishlistId(null);
    }
  }, [authenticated, session?.accessToken, wishlistIds, router]);

  // Get primary image for a product
  const getPrimaryImage = (product: Product) => {
    if (!product.images || product.images.length === 0) return null;
    const primary = product.images.find((img) => img.is_primary);
    return primary || product.images[0];
  };

  // Format price
  const formatPrice = (product: Product) => {
    const price = product.final_price ?? product.base_price;
    if (!price) return "Contact for price";
    return `KSh ${parseFloat(price.toString()).toLocaleString()}`;
  };

  const hasDiscount = (product: Product) =>
    product.discount_type && product.discount_value && product.discount_value > 0;

  // ─── Filter sidebar content (shared between desktop & mobile sheet) ─────
  const filterContent = (
    <div className="space-y-6">
      {/* Search */}
      <div className="space-y-2">
        <Label htmlFor="search" className="text-sm font-semibold">Search</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="search"
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 rounded-xl border-border/60 bg-white/60"
          />
        </div>
      </div>

      {/* Brand */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Brand</Label>
        <Select
          value={filters.brandId || "all"}
          onValueChange={(v) => updateFilter("brandId", v === "all" ? undefined : v)}
        >
          <SelectTrigger className="rounded-xl bg-white/60">
            <SelectValue placeholder="All brands" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All brands</SelectItem>
            {brands.map((brand) => (
              <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Category</Label>
        <Select
          value={filters.categoryId || "all"}
          onValueChange={(v) => updateFilter("categoryId", v === "all" ? undefined : v)}
        >
          <SelectTrigger className="rounded-xl bg-white/60">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Price Range */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Price Range (KSh)</Label>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={priceMin}
            onChange={(e) => setPriceMin(e.target.value)}
            min="0"
            className="rounded-xl bg-white/60"
          />
          <Input
            type="number"
            placeholder="Max"
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
            min="0"
            className="rounded-xl bg-white/60"
          />
        </div>
        <Button
          size="sm"
          onClick={applyPriceFilter}
          className="w-full rounded-xl"
          variant="outline"
        >
          Apply
        </Button>
      </div>

      {/* In Stock Only */}
      <div className="flex items-center space-x-2">
        <Switch
          id="inStock"
          checked={filters.inStockOnly ?? true}
          onCheckedChange={(checked) => updateFilter("inStockOnly", checked)}
        />
        <Label htmlFor="inStock" className="cursor-pointer text-sm">
          In stock only
        </Label>
      </div>

      {/* Clear */}
      {hasActiveFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            clearFilters();
            setMobileFiltersOpen(false);
          }}
          className="w-full rounded-xl"
        >
          Clear All Filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fdfafc]">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden bg-hero-gradient text-white px-4 py-16 md:py-20">
        <div className="absolute -right-1/2 -top-1/2 h-[200%] w-[200%] bg-pink-subtle animate-hero-pulse" />
        <div className="container relative mx-auto">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-4 bg-vision-gradient text-white border-0 shadow-lg shadow-pink-500/30">
              Premium Beauty Products
            </Badge>
            <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl drop-shadow-lg">
              <span className="text-white">Shop </span>
              <span className="text-[#FFB6C1]">Products</span>
            </h1>
            <p className="text-lg text-white/80">
              Professional-grade makeup, skincare, and beauty tools
            </p>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* ─── Desktop Filter Sidebar ─── */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24 rounded-2xl border border-border/40 bg-white/80 backdrop-blur-md p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold">Filters</h2>
              {filterContent}
            </div>
          </aside>

          {/* ─── Main Content ─── */}
          <div className="flex-1 space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                {/* Mobile filter trigger */}
                <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="lg:hidden rounded-xl">
                      <SlidersHorizontal className="mr-2 h-4 w-4" />
                      Filters
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80 bg-[#fdfafc]">
                    <SheetHeader>
                      <SheetTitle>Filters</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6">
                      {filterContent}
                    </div>
                  </SheetContent>
                </Sheet>

                <p className="text-sm text-muted-foreground">
                  {loading
                    ? "Loading..."
                    : `Showing ${filteredProducts.length} of ${totalProducts} products`}
                </p>
              </div>

              {/* Sort */}
              <Select
                value={`${filters.sortBy}-${filters.sortOrder}`}
                onValueChange={(value) => {
                  const [sortBy, sortOrder] = value.split("-");
                  setFilters((prev) => ({ ...prev, sortBy, sortOrder: sortOrder as "asc" | "desc" }));
                }}
              >
                <SelectTrigger className="w-[180px] rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at-desc">Newest</SelectItem>
                  <SelectItem value="created_at-asc">Oldest</SelectItem>
                  <SelectItem value="base_price-asc">Price: Low to High</SelectItem>
                  <SelectItem value="base_price-desc">Price: High to Low</SelectItem>
                  <SelectItem value="title-asc">Name: A to Z</SelectItem>
                  <SelectItem value="title-desc">Name: Z to A</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Active Filters */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2">
                {getActiveFilters().map((filter, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="gap-1 rounded-full bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200"
                  >
                    {filter.label}: {filter.value}
                    <button
                      onClick={() => removeFilter(filter.key)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Product Grid */}
            {loading ? (
              <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="rounded-[2rem] overflow-hidden border border-pink-50 bg-white">
                    <Skeleton className="h-64 w-full" />
                    <div className="p-6 space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-3 w-16" />
                          <Skeleton className="h-5 w-3/4" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                        <Skeleton className="h-6 w-20" />
                      </div>
                      <Skeleton className="h-12 w-full rounded-2xl mt-2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-20 text-center">
                <Sparkles className="mx-auto mb-4 h-12 w-12 text-fuchsia-300" />
                <p className="text-lg font-medium text-muted-foreground">No products found</p>
                <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters</p>
                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters} className="mt-4 rounded-xl">
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
                {filteredProducts.map((product) => {
                  const isOutOfStock = product.inventory_count <= 0;
                  const image = getPrimaryImage(product);
                  const isInWishlist = wishlistIds.has(product.id);

                  return (
                    <Link
                      key={product.id}
                      href={`/products/${product.id}`}
                      className="group relative flex flex-col rounded-[2rem] border border-pink-50 bg-white overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-pink-100 hover:-translate-y-2"
                    >
                      {/* Badges */}
                      <div className="absolute left-4 top-4 z-10 flex flex-col gap-2">
                        {product.is_featured && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-white/90 backdrop-blur-sm px-3 py-1 text-[10px] font-black uppercase tracking-tighter text-pink-600 shadow-sm">
                            <Sparkles className="h-3 w-3" />
                            Featured
                          </span>
                        )}
                        {isOutOfStock && (
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-[10px] font-black uppercase tracking-tighter text-gray-500">
                            Sold Out
                          </span>
                        )}
                        {hasDiscount(product) && !isOutOfStock && (
                          <span className="inline-flex items-center rounded-full bg-rose-500 px-3 py-1 text-[10px] font-black uppercase tracking-tighter text-white shadow-lg">
                            {product.discount_type === "percentage"
                              ? `${product.discount_value}% OFF`
                              : `KSh ${product.discount_value} OFF`}
                          </span>
                        )}
                      </div>

                      {/* Wishlist Button */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleToggleWishlist(product);
                        }}
                        disabled={togglingWishlistId === product.id}
                        className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-sm transition-colors hover:text-pink-500"
                        aria-label={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
                      >
                        {togglingWishlistId === product.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-pink-500" />
                        ) : (
                          <Heart
                            className={`h-4 w-4 transition-colors ${
                              isInWishlist
                                ? "fill-pink-500 text-pink-500"
                                : "text-gray-400 hover:text-pink-500"
                            }`}
                          />
                        )}
                      </button>

                      {/* Image */}
                      <div className="relative h-64 overflow-hidden bg-gray-50">
                        {image ? (
                          <Image
                            src={resolveImageUrl(image.image_url)}
                            alt={image.alt_text || product.title}
                            fill
                            className="object-cover transition-transform duration-700 group-hover:scale-110"
                            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <ShoppingBag className="h-10 w-10 text-gray-200" />
                          </div>
                        )}

                        {/* Quick-view overlay */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                          <span className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-black shadow-xl translate-y-4 transition-transform duration-300 group-hover:translate-y-0">
                            <Eye className="h-4 w-4" />
                            Quick View
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex flex-1 flex-col p-6 space-y-3">
                        <div className="flex justify-between items-start gap-3">
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-pink-400">
                              {product.category?.name || "Beauty"}
                            </span>
                            <h3 className="font-bold text-lg leading-tight text-[#1a0f1c] line-clamp-2 group-hover:text-pink-600 transition-colors">
                              {product.title}
                            </h3>
                            {product.brand && (
                              <p className="mt-1 text-xs text-gray-400">
                                {product.brand.name}
                              </p>
                            )}
                          </div>
                          <div className="flex-shrink-0 text-right">
                            {hasDiscount(product) ? (
                              <>
                                <p className="text-sm font-medium text-gray-400 line-through">
                                  KSh {parseFloat(product.base_price.toString()).toLocaleString()}
                                </p>
                                <p className="font-black text-xl text-[#1a0f1c]">
                                  {formatPrice(product)}
                                </p>
                              </>
                            ) : (
                              <p className="font-black text-xl text-[#1a0f1c]">
                                {formatPrice(product)}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* CTA */}
                        <div className="pt-2 mt-auto">
                          {isOutOfStock ? (
                            <>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  toast.info("We\u2019ll notify you when this item is back in stock!");
                                }}
                                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-gray-100 py-3 text-sm font-bold text-gray-400 transition-all hover:border-pink-200 hover:text-pink-500"
                              >
                                Notify Me
                              </button>
                              <p className="mt-2 text-center text-[10px] font-medium italic text-rose-400">
                                Restocking soon
                              </p>
                            </>
                          ) : cartMap.has(product.id) ? (
                            <div
                              className="flex w-full items-center rounded-2xl border-2 border-pink-200 bg-pink-50 overflow-hidden"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            >
                              <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleUpdateQuantity(product.id, -1); }}
                                disabled={updatingCartId === product.id}
                                className="flex items-center justify-center px-4 py-3 text-pink-700 hover:bg-pink-100 transition-colors disabled:opacity-50"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <div className="flex-1 flex items-center justify-center border-x border-pink-200 py-3">
                                {updatingCartId === product.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-pink-600" />
                                ) : (
                                  <span className="text-sm font-bold text-pink-800">
                                    {cartMap.get(product.id)!.quantity} in bag
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleUpdateQuantity(product.id, 1); }}
                                disabled={updatingCartId === product.id}
                                className="flex items-center justify-center px-4 py-3 text-pink-700 hover:bg-pink-100 transition-colors disabled:opacity-50"
                                aria-label="Increase quantity"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleAddToCart(product);
                              }}
                              disabled={addingToCartId === product.id}
                              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-pink-500 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-pink-600 active:scale-95 disabled:opacity-60 disabled:active:scale-100"
                            >
                              {addingToCartId === product.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <ShoppingBag className="h-4 w-4" />
                              )}
                              Add to Bag
                            </button>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateFilter("page", (filters.page ?? 1) - 1)}
                  disabled={filters.page === 1}
                  className="rounded-xl"
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if ((filters.page ?? 1) <= 3) {
                      pageNum = i + 1;
                    } else if ((filters.page ?? 1) >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = (filters.page ?? 1) - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={filters.page === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateFilter("page", pageNum)}
                        className="w-10 rounded-xl"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  {totalPages > 5 && (filters.page ?? 1) < totalPages - 2 && (
                    <>
                      <span className="px-1 text-muted-foreground">&hellip;</span>
                      <Button
                        variant={filters.page === totalPages ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateFilter("page", totalPages)}
                        className="w-10 rounded-xl"
                      >
                        {totalPages}
                      </Button>
                    </>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateFilter("page", (filters.page ?? 1) + 1)}
                  disabled={filters.page === totalPages}
                  className="rounded-xl"
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
