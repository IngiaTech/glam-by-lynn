"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useRequireAdmin } from "@/hooks/useAuth";
import axios from "axios";
import { z } from "zod";

const categorySchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name too long"),
  description: z.string().optional(),
  image_url: z.string().url("Invalid URL").optional().or(z.literal("")),
  parent_category_id: z.string().optional(),
  display_order: z.number().int().min(0),
  is_active: z.boolean(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface Category {
  id: string;
  name: string;
}

export default function EditCategory() {
  const router = useRouter();
  const params = useParams();
  const categoryId = params.id as string;
  const { user, loading: authLoading, isAdmin } = useRequireAdmin();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: "",
    description: "",
    image_url: "",
    parent_category_id: "",
    display_order: 0,
    is_active: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      if (!isAdmin || !categoryId) return;

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const session = await fetch("/api/auth/session").then(res => res.json());
        const token = session?.user?.accessToken;

        if (!token) {
          setLoadError("Authentication required");
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };

        const [categoryRes, categoriesRes] = await Promise.all([
          axios.get(`${apiUrl}/api/admin/categories/${categoryId}`, { headers }),
          axios.get(`${apiUrl}/api/admin/categories?page_size=100`, { headers }),
        ]);

        const category = categoryRes.data;
        setFormData({
          name: category.name || "",
          description: category.description || "",
          image_url: category.image_url || "",
          parent_category_id: category.parent_category_id || "",
          display_order: category.display_order || 0,
          is_active: category.is_active ?? true,
        });

        // Filter out current category and its descendants from parent options
        const filteredCategories = (categoriesRes.data.items || []).filter(
          (cat: Category) => cat.id !== categoryId
        );
        setCategories(filteredCategories);
      } catch (err: any) {
        console.error("Error fetching data:", err);
        setLoadError(err.response?.data?.detail || "Failed to load category");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAdmin, categoryId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSubmitError("");

    try {
      categorySchema.parse(formData);
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
      const token = session?.user?.accessToken;

      if (!token) {
        setSubmitError("Authentication required");
        return;
      }

      const submitData: any = { ...formData };
      if (!submitData.image_url) delete submitData.image_url;
      if (!submitData.description) delete submitData.description;
      if (!submitData.parent_category_id) delete submitData.parent_category_id;

      await axios.put(
        `${apiUrl}/api/admin/categories/${categoryId}`,
        submitData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      router.push("/admin/categories");
    } catch (err: any) {
      console.error("Error updating category:", err);
      setSubmitError(err.response?.data?.detail || "Failed to update category");
    } finally {
      setSubmitting(false);
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
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded">
          {loadError}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Edit Category</h1>
        <p className="text-muted-foreground mt-1">Update category information</p>
      </div>

      {submitError && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded">
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Category Information</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
                placeholder="Category name"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
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
                placeholder="Category description"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Parent Category
              </label>
              <select
                value={formData.parent_category_id}
                onChange={(e) => setFormData({ ...formData, parent_category_id: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
              >
                <option value="">None (Top Level)</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <p className="text-sm text-muted-foreground mt-1">
                Select a parent category to create a subcategory
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Image URL
              </label>
              <input
                type="url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
                placeholder="https://example.com/image.png"
              />
              {errors.image_url && <p className="text-red-500 text-sm mt-1">{errors.image_url}</p>}
              {formData.image_url && (
                <div className="mt-2">
                  <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                  <img
                    src={formData.image_url}
                    alt="Image preview"
                    className="h-20 w-20 object-cover border border-border rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Display Order
              </label>
              <input
                type="number"
                min="0"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Lower numbers appear first
              </p>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 text-secondary focus:ring-secondary border-border rounded"
              />
              <label htmlFor="is_active" className="ml-2 text-sm text-foreground">
                Active (visible in product filters)
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.push("/admin/categories")}
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
