"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useRequireAdmin } from "@/hooks/useAuth";
import { extractErrorMessage } from "@/lib/error-utils";
import axios from "axios";
import { z } from "zod";
import { ProductImageUpload, ProductImage } from "@/components/admin/ProductImageUpload";

const productSchema = z.object({
  title: z.string().min(1, "Title is required").max(500, "Title too long"),
  description: z.string().optional(),
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

export default function EditProduct() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const { user, loading: authLoading, isAdmin } = useRequireAdmin();

  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [loadError, setLoadError] = useState("");

  // Product images state
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!isAdmin || !productId) return;

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const session = await fetch("/api/auth/session").then(res => res.json());
        const token = session?.accessToken;

        if (!token) {
          setLoadError("Authentication required");
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };

        const [productRes, brandsRes, categoriesRes, imagesRes] = await Promise.all([
          axios.get(`${apiUrl}/api/admin/products/${productId}`, { headers }),
          axios.get(`${apiUrl}/api/admin/brands?page_size=100`, { headers }),
          axios.get(`${apiUrl}/api/admin/categories?page_size=100`, { headers }),
          axios.get(`${apiUrl}/api/admin/products/${productId}/images`, { headers }),
        ]);

        const product = productRes.data;

        setFormData({
          title: product.title || "",
          description: product.description || "",
          brand_id: product.brand?.id || "",
          category_id: product.category?.id || "",
          base_price: parseFloat(product.base_price) || 0,
          discount_type: product.discount_type || undefined,
          discount_value: parseFloat(product.discount_value) || 0,
          sku: product.sku || "",
          inventory_count: product.inventory_count || 0,
          low_stock_threshold: product.low_stock_threshold || 10,
          is_active: product.is_active ?? true,
          is_featured: product.is_featured ?? false,
          tags: product.tags || [],
          meta_title: product.meta_title || "",
          meta_description: product.meta_description || "",
        });

        setBrands(brandsRes.data.items || []);
        setCategories(categoriesRes.data.items || []);

        // Transform backend images to ProductImage format
        const existingImages: ProductImage[] = (imagesRes.data || []).map((img: any, index: number) => ({
          id: img.id,
          imageUrl: img.image_url,
          altText: img.alt_text || "",
          isPrimary: img.is_primary,
          displayOrder: img.display_order ?? index,
        }));
        setProductImages(existingImages);
      } catch (err: any) {
        console.error("Error fetching data:", err);
        setLoadError(extractErrorMessage(err, "Failed to load product"));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAdmin, productId]);

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

      await axios.put(
        `${apiUrl}/api/admin/products/${productId}`,
        submitData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      router.push("/admin/products");
    } catch (err: any) {
      console.error("Error updating product:", err);
      setSubmitError(extractErrorMessage(err, "Failed to update product"));
    } finally {
      setSubmitting(false);
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

  const handleImagesChange = async (newImages: ProductImage[]) => {
    // Find newly added images (those with file property but no id)
    const imagesToUpload = newImages.filter(img => img.file && !img.id);

    if (imagesToUpload.length > 0) {
      setUploadingMedia(true);
      setSubmitError("");

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const session = await fetch("/api/auth/session").then(res => res.json());
        const token = session?.accessToken;

        if (!token) {
          setSubmitError("Authentication required");
          return;
        }

        // Upload each new image
        for (const image of imagesToUpload) {
          if (image.file) {
            const formData = new FormData();
            formData.append("file", image.file);
            formData.append("alt_text", image.altText || "");
            formData.append("is_primary", image.isPrimary.toString());
            formData.append("display_order", image.displayOrder.toString());

            const response = await axios.post(
              `${apiUrl}/api/admin/products/${productId}/images`,
              formData,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "multipart/form-data",
                },
              }
            );

            // Replace the temporary image with the uploaded one
            const uploadedImage = response.data.image;
            const index = newImages.findIndex(img => img.file === image.file);
            if (index !== -1) {
              newImages[index] = {
                id: uploadedImage.id,
                imageUrl: uploadedImage.image_url,
                altText: uploadedImage.alt_text || "",
                isPrimary: uploadedImage.is_primary,
                displayOrder: uploadedImage.display_order,
              };
            }
          }
        }

        setProductImages(newImages);
      } catch (err: any) {
        console.error("Error uploading images:", err);
        setSubmitError(extractErrorMessage(err, "Failed to upload images"));
      } finally {
        setUploadingMedia(false);
      }
    } else {
      setProductImages(newImages);
    }

    // Check if any images were removed
    const removedImages = productImages.filter(
      oldImg => oldImg.id && !newImages.find(newImg => newImg.id === oldImg.id)
    );

    if (removedImages.length > 0) {
      await handleDeleteImages(removedImages);
    }
  };

  const handleDeleteImages = async (imagesToDelete: ProductImage[]) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const session = await fetch("/api/auth/session").then(res => res.json());
      const token = session?.accessToken;

      if (!token) {
        setSubmitError("Authentication required");
        return;
      }

      // Delete each image
      for (const image of imagesToDelete) {
        if (image.id) {
          setDeletingImageId(image.id);
          await axios.delete(
            `${apiUrl}/api/admin/images/${image.id}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
        }
      }
    } catch (err: any) {
      console.error("Error deleting images:", err);
      setSubmitError(extractErrorMessage(err, "Failed to delete images"));
    } finally {
      setDeletingImageId(null);
    }
  };

  if (authLoading || loading) {
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

  if (loadError) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded">
          {loadError}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Edit Product</h1>
        <p className="text-muted-foreground mt-1">Update product information</p>
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
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
                placeholder="Product name"
              />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
                placeholder="Product description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Brand
                </label>
                <select
                  value={formData.brand_id}
                  onChange={(e) => setFormData({ ...formData, brand_id: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
                >
                  <option value="">Select Brand</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Category
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
                >
                  <option value="">Select Category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                SKU
              </label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
                placeholder="Stock keeping unit"
              />
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Pricing</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Base Price (KES) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.base_price || ""}
                onChange={(e) => setFormData({ ...formData, base_price: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
              />
              {errors.base_price && <p className="text-red-500 text-sm mt-1">{errors.base_price}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Discount Type
                </label>
                <select
                  value={formData.discount_type || ""}
                  onChange={(e) => setFormData({
                    ...formData,
                    discount_type: e.target.value as "percentage" | "fixed" | undefined
                  })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
                >
                  <option value="">No Discount</option>
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
              </div>

              {formData.discount_type && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Discount Value {formData.discount_type === "percentage" && "(%)"}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    max={formData.discount_type === "percentage" ? "100" : undefined}
                    value={formData.discount_value || ""}
                    onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
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
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Inventory Count <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={formData.inventory_count || ""}
                onChange={(e) => setFormData({ ...formData, inventory_count: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
              />
              {errors.inventory_count && <p className="text-red-500 text-sm mt-1">{errors.inventory_count}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Low Stock Threshold
              </label>
              <input
                type="number"
                min="0"
                value={formData.low_stock_threshold || ""}
                onChange={(e) => setFormData({ ...formData, low_stock_threshold: parseInt(e.target.value) || 10 })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
              />
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Tags</h2>

          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
                placeholder="Add a tag"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/90"
              >
                Add
              </button>
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

        {/* SEO */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">SEO Metadata</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Meta Title
              </label>
              <input
                type="text"
                maxLength={255}
                value={formData.meta_title}
                onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
                placeholder="SEO title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Meta Description
              </label>
              <textarea
                value={formData.meta_description}
                onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
                placeholder="SEO description"
              />
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Status</h2>

          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 text-secondary focus:ring-secondary border-border rounded"
              />
              <label htmlFor="is_active" className="ml-2 text-sm text-foreground">
                Active (visible to customers)
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_featured"
                checked={formData.is_featured}
                onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                className="h-4 w-4 text-secondary focus:ring-secondary border-border rounded"
              />
              <label htmlFor="is_featured" className="ml-2 text-sm text-foreground">
                Featured product
              </label>
            </div>
          </div>
        </div>

        {/* Product Images */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Product Images</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Upload product images (up to 10). Images are uploaded immediately.
          </p>
          <ProductImageUpload
            productId={productId}
            images={productImages}
            onImagesChange={handleImagesChange}
            maxImages={10}
            disabled={submitting || uploadingMedia}
          />
          {uploadingMedia && (
            <div className="mt-4 text-sm text-muted-foreground flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-secondary"></div>
              Uploading images...
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.push("/admin/products")}
            className="px-6 py-2 border border-border rounded-lg text-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/90 disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
