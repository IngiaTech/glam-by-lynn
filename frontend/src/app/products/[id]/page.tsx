/**
 * Product Detail Page
 * Enhanced with image gallery, zoom, variants, cart, and wishlist
 */

"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ReviewSubmissionForm } from "@/components/ReviewSubmissionForm";
import { RatingSummary } from "@/components/RatingSummary";
import { ReviewList } from "@/components/ReviewList";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  ArrowLeft,
  ShoppingCart,
  ShoppingBag,
  Heart,
  Minus,
  Plus,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  Sparkles,
  Bell,
  Eye,
} from "lucide-react";
import { getProductById, getProductBySlug } from "@/lib/products";
import { getProductRatingSummary, type ProductRatingSummary } from "@/lib/reviews";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { API_BASE_URL, API_ENDPOINTS } from "@/config/api";
import { resolveImageUrl } from "@/lib/utils";
import type { Product } from "@/types";

interface ProductDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ProductDetailPage({ params }: ProductDetailPageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { authenticated, session } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [ratingSummary, setRatingSummary] = useState<ProductRatingSummary | null>(null);
  const [filterRating, setFilterRating] = useState<number | null>(null);

  // Product interaction states
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [zoomImageOpen, setZoomImageOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [addingToWishlist, setAddingToWishlist] = useState(false);
  const [inWishlist, setInWishlist] = useState(false);

  // Related product card interactions
  const [relatedAddingToCartId, setRelatedAddingToCartId] = useState<string | null>(null);
  const [relatedWishlistIds, setRelatedWishlistIds] = useState<Set<string>>(new Set());
  const [relatedTogglingWishlistId, setRelatedTogglingWishlistId] = useState<string | null>(null);

  useEffect(() => {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedParams.id);

    const fetchProduct = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = isUUID
          ? await getProductById(resolvedParams.id)
          : await getProductBySlug(resolvedParams.id);
        setProduct(data);

        // Fetch rating summary using the resolved product UUID
        try {
          const summary = await getProductRatingSummary(data.id);
          setRatingSummary(summary);
        } catch (ratingErr) {
          console.error("Error fetching rating summary:", ratingErr);
          setRatingSummary({
            totalReviews: 0,
            averageRating: 0,
            ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          });
        }

        // Fetch related products (same category)
        if (data.category_id) {
          const relatedRes = await fetch(
            `${API_BASE_URL}${API_ENDPOINTS.PRODUCTS.LIST}?category=${data.category_id}&limit=4`
          );
          if (relatedRes.ok) {
            const relatedData = await relatedRes.json();
            // Filter out current product
            const items = relatedData.items || relatedData;
            setRelatedProducts(items.filter((p: Product) => p.id !== data.id).slice(0, 3));
          }
        }
      } catch (err) {
        console.error("Error fetching product:", err);
        setError("Failed to load product details. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [resolvedParams.id, refreshKey]);

  // Check wishlist for current and related products
  useEffect(() => {
    const checkWishlist = async () => {
      if (!authenticated || !product) return;

      try {
        const res = await fetch(`${API_BASE_URL}/wishlist`, {
          headers: { Authorization: `Bearer ${session?.accessToken}` },
        });
        if (res.ok) {
          const wishlist = await res.json();
          const ids = new Set(wishlist.map((item: any) => item.productId));
          setInWishlist(ids.has(product.id));
          setRelatedWishlistIds(ids as Set<string>);
        }
      } catch (error) {
        console.error("Error checking wishlist:", error);
      }
    };

    checkWishlist();
  }, [authenticated, product]);

  const handleReviewSubmitted = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleFilterByRating = (rating: number | null) => {
    setFilterRating(rating);
  };

  const handleAddToCart = async () => {
    if (!authenticated) {
      router.push("/auth/signin?redirect=/products/" + product?.id);
      return;
    }

    setAddingToCart(true);
    try {
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CART.ADD_ITEM}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({
          productId: product?.id,
          productVariantId: selectedVariant || undefined,
          quantity,
        }),
      });

      if (res.ok) {
        toast.success("Added to bag!");
      } else {
        const errorData = await res.json();
        toast.error(errorData.detail || "Failed to add to bag");
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error("Failed to add to bag");
    } finally {
      setAddingToCart(false);
    }
  };

  const handleToggleWishlist = async () => {
    if (!authenticated) {
      router.push("/auth/signin?redirect=/products/" + product?.id);
      return;
    }

    setAddingToWishlist(true);
    try {
      if (inWishlist) {
        const res = await fetch(`${API_BASE_URL}/wishlist/${product?.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${session?.accessToken}` },
        });
        if (res.ok) {
          setInWishlist(false);
          toast.success("Removed from wishlist");
        }
      } else {
        const res = await fetch(`${API_BASE_URL}/wishlist`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.accessToken}`,
          },
          body: JSON.stringify({ productId: product?.id }),
        });
        if (res.ok) {
          setInWishlist(true);
          toast.success("Added to wishlist!");
        }
      }
    } catch (error) {
      console.error("Error toggling wishlist:", error);
      toast.error("Failed to update wishlist");
    } finally {
      setAddingToWishlist(false);
    }
  };

  const handlePreviousImage = () => {
    if (!product?.images) return;
    setSelectedImageIndex((prev) =>
      prev === 0 ? product.images!.length - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    if (!product?.images) return;
    setSelectedImageIndex((prev) =>
      prev === product.images!.length - 1 ? 0 : prev + 1
    );
  };

  const handleRelatedAddToCart = async (rp: Product) => {
    if (!authenticated) {
      router.push(`/auth/signin?redirect=/products/${rp.id}`);
      return;
    }
    setRelatedAddingToCartId(rp.id);
    try {
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CART.ADD_ITEM}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({ productId: rp.id, quantity: 1 }),
      });
      if (res.ok) {
        toast.success(`${rp.title} added to bag`);
      } else {
        const err = await res.json();
        toast.error(err.detail || "Failed to add to bag");
      }
    } catch {
      toast.error("Failed to add to bag");
    } finally {
      setRelatedAddingToCartId(null);
    }
  };

  const handleRelatedToggleWishlist = async (rp: Product) => {
    if (!authenticated) {
      router.push(`/auth/signin?redirect=/products/${rp.id}`);
      return;
    }
    const isIn = relatedWishlistIds.has(rp.id);
    setRelatedTogglingWishlistId(rp.id);
    try {
      if (isIn) {
        const res = await fetch(`${API_BASE_URL}/wishlist/${rp.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${session?.accessToken}` },
        });
        if (res.ok) {
          setRelatedWishlistIds((prev) => { const next = new Set(prev); next.delete(rp.id); return next; });
          toast.success("Removed from wishlist");
        }
      } else {
        const res = await fetch(`${API_BASE_URL}/wishlist`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.accessToken}`,
          },
          body: JSON.stringify({ productId: rp.id }),
        });
        if (res.ok) {
          setRelatedWishlistIds((prev) => new Set(prev).add(rp.id));
          toast.success("Added to wishlist!");
        }
      }
    } catch {
      toast.error("Failed to update wishlist");
    } finally {
      setRelatedTogglingWishlistId(null);
    }
  };

  const formatRelatedPrice = (rp: Product) => {
    const price = rp.final_price ?? rp.base_price;
    if (!price) return "Contact for price";
    return `KSh ${parseFloat(price.toString()).toLocaleString()}`;
  };

  const relatedHasDiscount = (rp: Product) =>
    rp.discount_type && rp.discount_value && rp.discount_value > 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="mb-4 h-10 w-32" />
          <div className="grid gap-8 lg:grid-cols-2">
            <Skeleton className="h-96 w-full" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Button variant="ghost" onClick={() => router.back()} className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="mb-4 text-lg font-medium">
                {error || "Product not found"}
              </p>
              <Button onClick={() => router.push("/products")}>
                Browse All Products
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const effectivePrice = product.base_price;
  const hasDiscount =
    product.discount_type && product.discount_value && product.discount_value > 0;
  const hasImages = product.images && product.images.length > 0;
  const currentImage = hasImages && product.images ? product.images[selectedImageIndex] : null;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => router.back()} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Products
        </Button>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Product Images Section */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative overflow-hidden rounded-lg border border-border bg-muted">
              {hasImages ? (
                <>
                  <div className="relative aspect-square">
                    <Image
                      src={resolveImageUrl(currentImage!.image_url)}
                      alt={currentImage!.alt_text || product.title}
                      fill
                      className="object-cover"
                      priority
                    />
                  </div>

                  {/* Zoom Button */}
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute right-4 top-4"
                    onClick={() => setZoomImageOpen(true)}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>

                  {/* Image Navigation */}
                  {product.images && product.images.length > 1 && (
                    <>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute left-4 top-1/2 -translate-y-1/2"
                        onClick={handlePreviousImage}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute right-4 top-1/2 -translate-y-1/2"
                        onClick={handleNextImage}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </>
                  )}

                  {/* Image Counter */}
                  {product.images && product.images.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-sm text-white">
                      {selectedImageIndex + 1} / {product.images.length}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex aspect-square items-center justify-center text-muted-foreground">
                  No image available
                </div>
              )}
            </div>

            {/* Thumbnail Gallery */}
            {hasImages && product.images && product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {product.images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`relative aspect-square overflow-hidden rounded-md border-2 ${
                      index === selectedImageIndex
                        ? "border-secondary"
                        : "border-border hover:border-secondary/50"
                    }`}
                  >
                    <Image
                      src={resolveImageUrl(img.image_url)}
                      alt={img.alt_text || `${product.title} - ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info Section */}
          <div className="space-y-6">
            {/* Title and Brand */}
            <div>
              <div className="mb-2 flex items-center gap-2">
                {product.brand && (
                  <Badge variant="outline">{product.brand.name}</Badge>
                )}
                {product.category && (
                  <Badge variant="secondary">{product.category.name}</Badge>
                )}
                {product.is_featured && <Badge>Featured</Badge>}
              </div>
              <h1 className="text-3xl font-bold tracking-tight">{product.title}</h1>
              {product.sku && (
                <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
              )}
            </div>

            {/* Rating */}
            {ratingSummary && ratingSummary.totalReviews > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <span
                      key={i}
                      className={`text-lg ${
                        i < Math.round(ratingSummary.averageRating)
                          ? "text-secondary"
                          : "text-muted"
                      }`}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  {ratingSummary.averageRating.toFixed(1)} ({ratingSummary.totalReviews}{" "}
                  reviews)
                </span>
              </div>
            )}

            {/* Price */}
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">
                  KSh {effectivePrice ? parseFloat(effectivePrice.toString()).toLocaleString() : "0"}
                </span>
                {hasDiscount && (
                  <Badge variant="destructive">
                    {product.discount_type === "percentage"
                      ? `${product.discount_value}% OFF`
                      : `KSh ${product.discount_value} OFF`}
                  </Badge>
                )}
              </div>
            </div>

            {/* Stock Status */}
            <div>
              {product.inventory_count > 0 ? (
                <Badge variant="outline" className="border-green-500 text-green-700">
                  In Stock ({product.inventory_count} available)
                </Badge>
              ) : (
                <Badge variant="destructive">Out of Stock</Badge>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <div>
                <h2 className="mb-2 text-lg font-semibold">Description</h2>
                <p className="text-muted-foreground">{product.description}</p>
              </div>
            )}

            {/* Variant Selector */}
            {product.variants && product.variants.length > 0 && (
              <div className="space-y-2">
                <Label>Select Variant</Label>
                <Select
                  value={selectedVariant || undefined}
                  onValueChange={setSelectedVariant}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a variant" />
                  </SelectTrigger>
                  <SelectContent>
                    {product.variants.map((variant) => (
                      <SelectItem key={variant.id} value={variant.id}>
                        {variant.variant_type}: {variant.variant_value}
                        {variant.price_adjustment !== 0 && (
                          <span className="ml-2 text-sm text-muted-foreground">
                            (+KSh {variant.price_adjustment.toLocaleString()})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Quantity Selector */}
            <div className="space-y-2">
              <Label>Quantity</Label>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  min="1"
                  max={product.inventory_count}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 text-center"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setQuantity(Math.min(product.inventory_count, quantity + 1))
                  }
                  disabled={quantity >= product.inventory_count}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Tags */}
            {product.tags && product.tags.length > 0 && (
              <div>
                <h2 className="mb-2 text-sm font-semibold">Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {product.tags.map((tag, index) => (
                    <Badge key={index} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                size="lg"
                className="flex-1"
                disabled={product.inventory_count === 0 || addingToCart}
                onClick={handleAddToCart}
              >
                {addingToCart ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    {product.inventory_count === 0 ? "Out of Stock" : "Add to Bag"}
                  </>
                )}
              </Button>
              <Button
                size="lg"
                variant={inWishlist ? "secondary" : "outline"}
                onClick={handleToggleWishlist}
                disabled={addingToWishlist}
              >
                {addingToWishlist ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Heart
                    className={`h-5 w-5 ${inWishlist ? "fill-current" : ""}`}
                  />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-16">
            <h2 className="mb-6 text-2xl font-bold">Related Products</h2>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {relatedProducts.map((rp) => {
                const rpImage = rp.images?.find((img) => img.is_primary) || rp.images?.[0];
                const rpOutOfStock = rp.inventory_count <= 0;
                const rpInWishlist = relatedWishlistIds.has(rp.id);

                return (
                  <Link
                    key={rp.id}
                    href={`/products/${rp.id}`}
                    className="group relative flex flex-col rounded-[2rem] border border-pink-50 bg-white overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-pink-100 hover:-translate-y-2"
                  >
                    {/* Badges */}
                    <div className="absolute left-4 top-4 z-10 flex flex-col gap-2">
                      {rp.is_featured && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/90 backdrop-blur-sm px-3 py-1 text-[10px] font-black uppercase tracking-tighter text-pink-600 shadow-sm">
                          <Sparkles className="h-3 w-3" />
                          Featured
                        </span>
                      )}
                      {rpOutOfStock && (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-[10px] font-black uppercase tracking-tighter text-gray-500">
                          Sold Out
                        </span>
                      )}
                      {relatedHasDiscount(rp) && !rpOutOfStock && (
                        <span className="inline-flex items-center rounded-full bg-rose-500 px-3 py-1 text-[10px] font-black uppercase tracking-tighter text-white shadow-lg">
                          {rp.discount_type === "percentage"
                            ? `${rp.discount_value}% OFF`
                            : `KSh ${rp.discount_value} OFF`}
                        </span>
                      )}
                    </div>

                    {/* Wishlist */}
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRelatedToggleWishlist(rp); }}
                      disabled={relatedTogglingWishlistId === rp.id}
                      className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-sm transition-colors hover:text-pink-500"
                      aria-label={rpInWishlist ? "Remove from wishlist" : "Add to wishlist"}
                    >
                      {relatedTogglingWishlistId === rp.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-pink-500" />
                      ) : (
                        <Heart className={`h-4 w-4 transition-colors ${rpInWishlist ? "fill-pink-500 text-pink-500" : "text-gray-400 hover:text-pink-500"}`} />
                      )}
                    </button>

                    {/* Image */}
                    <div className="relative h-64 overflow-hidden bg-gray-50">
                      {rpImage ? (
                        <Image
                          src={resolveImageUrl(rpImage.image_url)}
                          alt={rpImage.alt_text || rp.title}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-110"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <ShoppingBag className="h-10 w-10 text-gray-200" />
                        </div>
                      )}
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
                            {rp.category?.name || "Beauty"}
                          </span>
                          <h3 className="font-bold text-lg leading-tight text-[#1a0f1c] line-clamp-2 group-hover:text-pink-600 transition-colors">
                            {rp.title}
                          </h3>
                          {rp.brand && (
                            <p className="mt-1 text-xs text-gray-400">{rp.brand.name}</p>
                          )}
                        </div>
                        <p className="font-black text-xl text-[#1a0f1c] flex-shrink-0">
                          {formatRelatedPrice(rp)}
                        </p>
                      </div>

                      <div className="pt-2 mt-auto">
                        {rpOutOfStock ? (
                          <>
                            <button
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); toast.info("We\u2019ll notify you when this item is back in stock!"); }}
                              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-gray-100 py-3 text-sm font-bold text-gray-400 transition-all hover:border-pink-200 hover:text-pink-500"
                            >
                              Notify Me
                            </button>
                            <p className="mt-2 text-center text-[10px] font-medium italic text-rose-400">Restocking soon</p>
                          </>
                        ) : (
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRelatedAddToCart(rp); }}
                            disabled={relatedAddingToCartId === rp.id}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-pink-500 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-pink-600 active:scale-95 disabled:opacity-60 disabled:active:scale-100"
                          >
                            {relatedAddingToCartId === rp.id ? (
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
          </div>
        )}

        {/* Review Submission Form */}
        <div className="mt-16">
          <ReviewSubmissionForm
            productId={product.id}
            productTitle={product.title}
            onReviewSubmitted={handleReviewSubmitted}
          />
        </div>

        {/* Reviews Display Section */}
        {ratingSummary && ratingSummary.totalReviews > 0 && (
          <div className="mt-12 space-y-8">
            <h2 className="text-2xl font-bold">Customer Reviews</h2>

            {/* Rating Summary */}
            <RatingSummary
              summary={ratingSummary}
              onFilterByRating={handleFilterByRating}
              selectedRating={filterRating}
            />

            {/* Review List */}
            <ReviewList productId={product.id} filterRating={filterRating} />
          </div>
        )}
      </main>

      {/* Image Zoom Dialog */}
      <Dialog open={zoomImageOpen} onOpenChange={setZoomImageOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{product.title}</DialogTitle>
          </DialogHeader>
          {currentImage && (
            <div className="relative aspect-square w-full">
              <Image
                src={resolveImageUrl(currentImage.image_url)}
                alt={currentImage.alt_text || product.title}
                fill
                className="object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
