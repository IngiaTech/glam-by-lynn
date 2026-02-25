"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRequireAdmin } from "@/hooks/useAuth";
import { extractErrorMessage } from "@/lib/error-utils";
import axios from "axios";
import { z } from "zod";
import { ProductImageUpload, ProductImage } from "@/components/admin/ProductImageUpload";
import { ProductVideoInput, ProductVideo } from "@/components/admin/ProductVideoInput";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const productSchema = z.object({
  title: z.string().min(1, "Title is required").max(500, "Title too long"),
  description: z.string().min(1, "Description is required"),
  brand_id: z.string().optional(),
  category_id: z.string().optional(),
  base_price: z.number().min(0, "Price must be positive"),
  discount_type: z.enum(["percentage", "fixed"]).optional(),
  discount_value: z.number().min(0).optional(),
  sku: z.string().max(100).optional(),
  inventory_count: z.number().int().min(0, "Inventory cannot be negative"),
  low_stock_threshold: z.number().int().min(0),
  is_active: z.boolean(),
  is_featured: z.boolean(),
  tags: z.array(z.string()).optional(),
  meta_title: z.string().max(255).optional(),
  meta_description: z.string().optional(),
}).refine(
  (data) => {
    if (data.discount_type === "percentage" && data.discount_value) {
      return data.discount_value <= 100;
    }
    return true;
  },
  {
    message: "Percentage discount cannot exceed 100",
    path: ["discount_value"],
  }
);

type ProductFormData = z.infer<typeof productSchema>;

interface Brand {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

export default function NewProduct() {
  const router = useRouter();
  const { user, loading, isAdmin } = useRequireAdmin();

  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState<ProductFormData>({
    title: "",
    description: "",
    brand_id: "",
    category_id: "",
    base_price: 0,
    discount_type: undefined,
    discount_value: 0,
    sku: "",
    inventory_count: 0,
    low_stock_threshold: 10,
    is_active: true,
    is_featured: false,
    tags: [],
    meta_title: "",
    meta_description: "",
  });

  const [tagInput, setTagInput] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Image and video state
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [productVideos, setProductVideos] = useState<ProductVideo[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [createdProductId, setCreatedProductId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!isAdmin) return;

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const session = await fetch("/api/auth/session").then(res => res.json());
        const token = session?.accessToken;

        if (!token) return;

        const headers = { Authorization: `Bearer ${token}` };

        const [brandsRes, categoriesRes] = await Promise.all([
          axios.get(`${apiUrl}/api/admin/brands?page_size=100`, { headers }),
          axios.get(`${apiUrl}/api/admin/categories?page_size=100`, { headers }),
        ]);

        setBrands(brandsRes.data.items || []);
        setCategories(categoriesRes.data.items || []);
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };

    fetchData();
  }, [isAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSubmitError("");

    // Validate
    try {
      productSchema.parse(formData);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.issues.forEach((error: any) => {
          if (error.path) {
            newErrors[error.path.join(".")] = error.message;
          }
        });
        setErrors(newErrors);
        return;
      }
    }

    setSubmitting(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const session = await fetch("/api/auth/session").then(res => res.json());
      const token = session?.accessToken;

      if (!token) {
        setSubmitError("Authentication required");
        return;
      }

      // Prepare data - remove empty strings
      const submitData: any = { ...formData };
      if (!submitData.brand_id) delete submitData.brand_id;
      if (!submitData.category_id) delete submitData.category_id;
      if (!submitData.discount_type) {
        delete submitData.discount_type;
        delete submitData.discount_value;
      }
      if (!submitData.sku) delete submitData.sku;
      if (!submitData.meta_title) delete submitData.meta_title;
      if (!submitData.meta_description) delete submitData.meta_description;
      if (!submitData.description) delete submitData.description;

      // Step 1: Create the product
      const createResponse = await axios.post(
        `${apiUrl}/api/admin/products`,
        submitData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const productId = createResponse.data.id;
      setCreatedProductId(productId);

      // Step 2: Upload images if any
      if (productImages.length > 0) {
        setUploadingMedia(true);

        for (const image of productImages) {
          if (image.file) {
            const formData = new FormData();
            formData.append("file", image.file);
            formData.append("alt_text", image.altText || "");
            formData.append("is_primary", image.isPrimary.toString());
            formData.append("display_order", image.displayOrder.toString());

            await axios.post(
              `${apiUrl}/api/admin/products/${productId}/images`,
              formData,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "multipart/form-data",
                },
              }
            );
          }
        }
      }

      // Step 3: Add video URLs if any (API endpoint to be implemented)
      // For now, we'll skip this until backend supports video URL endpoints
      // if (productVideos.length > 0) {
      //   for (const video of productVideos) {
      //     await axios.post(
      //       `${apiUrl}/api/admin/products/${productId}/videos`,
      //       video,
      //       { headers: { Authorization: `Bearer ${token}` } }
      //     );
      //   }
      // }

      router.push("/admin/products");
    } catch (err: any) {
      console.error("Error creating product:", err);
      setSubmitError(extractErrorMessage(err, "Failed to create product"));
    } finally {
      setSubmitting(false);
      setUploadingMedia(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), tagInput.trim()],
      });
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter(t => t !== tag) || [],
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Create Product</h1>
        <p className="text-muted-foreground mt-1">Add a new product to your catalog</p>
      </div>

      {submitError && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded">
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Basic Information</h2>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Product name"
              />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                placeholder="Product description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Brand</Label>
                <Select
                  value={formData.brand_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, brand_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Brand" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select Brand</SelectItem>
                    {brands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={formData.category_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select Category</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>SKU</Label>
              <Input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="Stock keeping unit"
              />
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Pricing</h2>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>
                Base Price (KES) <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.base_price || ""}
                onChange={(e) => setFormData({ ...formData, base_price: parseFloat(e.target.value) || 0 })}
              />
              {errors.base_price && <p className="text-red-500 text-sm mt-1">{errors.base_price}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Discount Type</Label>
                <Select
                  value={formData.discount_type || "none"}
                  onValueChange={(value) => setFormData({
                    ...formData,
                    discount_type: value === "none" ? undefined : value as "percentage" | "fixed"
                  })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="No Discount" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Discount</SelectItem>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.discount_type && (
                <div className="space-y-2">
                  <Label>
                    Discount Value {formData.discount_type === "percentage" && "(%)"}
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    max={formData.discount_type === "percentage" ? "100" : undefined}
                    value={formData.discount_value || ""}
                    onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                  />
                  {errors.discount_value && <p className="text-red-500 text-sm mt-1">{errors.discount_value}</p>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Inventory */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Inventory</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Inventory Count <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                min="0"
                value={formData.inventory_count || ""}
                onChange={(e) => setFormData({ ...formData, inventory_count: parseInt(e.target.value) || 0 })}
              />
              {errors.inventory_count && <p className="text-red-500 text-sm mt-1">{errors.inventory_count}</p>}
            </div>

            <div className="space-y-2">
              <Label>Low Stock Threshold</Label>
              <Input
                type="number"
                min="0"
                value={formData.low_stock_threshold || ""}
                onChange={(e) => setFormData({ ...formData, low_stock_threshold: parseInt(e.target.value) || 10 })}
              />
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Tags</h2>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                className="flex-1"
                placeholder="Add a tag"
              />
              <Button
                type="button"
                onClick={addTag}
              >
                Add
              </Button>
            </div>

            {formData.tags && formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-muted text-foreground rounded-full text-sm"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:text-red-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Product Images */}
        <div className="bg-card border border-border rounded-lg p-6">
          <ProductImageUpload
            images={productImages}
            onImagesChange={setProductImages}
            maxImages={10}
            disabled={submitting || uploadingMedia}
          />
        </div>

        {/* Product Videos */}
        <div className="bg-card border border-border rounded-lg p-6">
          <ProductVideoInput
            videos={productVideos}
            onVideosChange={setProductVideos}
            maxVideos={3}
            disabled={submitting || uploadingMedia}
          />
        </div>

        {/* SEO */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">SEO Metadata</h2>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Meta Title</Label>
              <Input
                type="text"
                maxLength={255}
                value={formData.meta_title}
                onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                placeholder="SEO title"
              />
            </div>

            <div className="space-y-2">
              <Label>Meta Description</Label>
              <Textarea
                value={formData.meta_description}
                onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                rows={3}
                placeholder="SEO description"
              />
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Status</h2>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Active (visible to customers)</Label>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="is_featured"
                checked={formData.is_featured}
                onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
              />
              <Label htmlFor="is_featured">Featured product</Label>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/products")}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitting || uploadingMedia}
          >
            {uploadingMedia
              ? "Uploading images..."
              : submitting
              ? "Creating product..."
              : "Create Product"}
          </Button>
        </div>
      </form>
    </div>
  );
}
