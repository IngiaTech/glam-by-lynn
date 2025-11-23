"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useRequireAdmin } from "@/hooks/useAuth";
import { extractErrorMessage } from "@/lib/error-utils";

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  parent_category_id?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  subcategories?: Category[];
}

interface CategoryTreeResponse {
  items: Category[];
  total: number;
}

export default function CategoriesManagement() {
  const router = useRouter();
  const { user, loading, isAdmin } = useRequireAdmin();

  const [categories, setCategories] = useState<Category[]>([]);
  const [totalCategories, setTotalCategories] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [error, setError] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchCategories = async () => {
      if (!isAdmin) return;

      setLoadingCategories(true);
      setError("");

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const session = await fetch("/api/auth/session").then(res => res.json());
        const token = session?.accessToken;

        if (!token) {
          setError("Authentication required");
          return;
        }

        const params = new URLSearchParams();
        if (statusFilter === "active") params.append("is_active", "true");
        if (statusFilter === "inactive") params.append("is_active", "false");

        const response = await axios.get<CategoryTreeResponse>(
          `${apiUrl}/api/admin/categories/tree?${params}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        let filteredCategories = response.data.items;

        // Apply search filter client-side
        if (search) {
          filteredCategories = filterCategoriesRecursive(filteredCategories, search.toLowerCase());
        }

        setCategories(filteredCategories);
        setTotalCategories(response.data.total);
      } catch (err: any) {
        console.error("Error fetching categories:", err);
        setError(extractErrorMessage(err, "Failed to load categories"));
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, [isAdmin, search, statusFilter]);

  const filterCategoriesRecursive = (cats: Category[], searchTerm: string): Category[] => {
    return cats.filter(cat => {
      const matches = cat.name.toLowerCase().includes(searchTerm) ||
                     cat.description?.toLowerCase().includes(searchTerm);
      const hasMatchingSubcategories = cat.subcategories &&
        filterCategoriesRecursive(cat.subcategories, searchTerm).length > 0;

      if (hasMatchingSubcategories) {
        cat.subcategories = filterCategoriesRecursive(cat.subcategories!, searchTerm);
      }

      return matches || hasMatchingSubcategories;
    });
  };

  const toggleExpand = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleToggleActive = async (categoryId: string, currentStatus: boolean) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const session = await fetch("/api/auth/session").then(res => res.json());
      const token = session?.accessToken;

      if (!token) return;

      await axios.put(
        `${apiUrl}/api/admin/categories/${categoryId}`,
        { is_active: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Refresh categories
      window.location.reload();
    } catch (err) {
      console.error("Error toggling category status:", err);
      alert("Failed to update category status");
    }
  };

  const handleDeleteCategory = async (categoryId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will also delete all subcategories and fail if there are products using this category.`)) {
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const session = await fetch("/api/auth/session").then(res => res.json());
      const token = session?.accessToken;

      if (!token) return;

      await axios.delete(
        `${apiUrl}/api/admin/categories/${categoryId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Refresh categories
      window.location.reload();
    } catch (err: any) {
      console.error("Error deleting category:", err);
      alert(extractErrorMessage(err, "Failed to delete category"));
    }
  };

  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("all");
  };

  const renderCategory = (category: Category, level: number = 0) => {
    const hasSubcategories = category.subcategories && category.subcategories.length > 0;
    const isExpanded = expandedCategories.has(category.id);
    const indent = level * 24;

    return (
      <div key={category.id}>
        <div className="flex items-center hover:bg-muted/50 transition-colors border-b border-border py-3 px-4">
          <div style={{ marginLeft: `${indent}px` }} className="flex items-center gap-2 flex-1">
            {hasSubcategories && (
              <button
                onClick={() => toggleExpand(category.id)}
                className="text-muted-foreground hover:text-foreground"
              >
                {isExpanded ? "▼" : "▶"}
              </button>
            )}
            {!hasSubcategories && <span className="w-4"></span>}

            <div className="flex items-center gap-3 flex-1">
              {category.image_url && (
                <img
                  src={category.image_url}
                  alt={category.name}
                  className="h-10 w-10 object-cover rounded"
                />
              )}
              <div className="flex-1">
                <div className="font-medium text-foreground">{category.name}</div>
                {category.description && (
                  <div className="text-sm text-muted-foreground line-clamp-1">
                    {category.description}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {category.slug}
            </span>
            <span
              className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                category.is_active
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {category.is_active ? "Active" : "Inactive"}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => router.push(`/admin/categories/${category.id}`)}
                className="text-secondary hover:text-secondary/80 text-sm"
              >
                Edit
              </button>
              <button
                onClick={() => handleToggleActive(category.id, category.is_active)}
                className="text-foreground hover:text-foreground/80 text-sm"
              >
                {category.is_active ? "Deactivate" : "Activate"}
              </button>
              <button
                onClick={() => handleDeleteCategory(category.id, category.name)}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        {isExpanded && hasSubcategories && (
          <div>
            {category.subcategories!.map(sub => renderCategory(sub, level + 1))}
          </div>
        )}
      </div>
    );
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Categories</h1>
          <p className="text-muted-foreground mt-1">
            Manage product categories with hierarchy
          </p>
        </div>
        <button
          onClick={() => router.push("/admin/categories/new")}
          className="bg-secondary hover:bg-secondary/90 text-foreground px-6 py-2 rounded-lg font-medium transition-colors"
        >
          Add Category
        </button>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Search
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search categories..."
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleClearFilters}
              className="w-full px-4 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Category Tree */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {error && (
          <div className="bg-destructive/10 border-l-4 border-destructive text-destructive px-4 py-3">
            {error}
          </div>
        )}

        {loadingCategories ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary"></div>
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No categories found</p>
          </div>
        ) : (
          <div>
            {categories.map(cat => renderCategory(cat))}
            <div className="bg-muted px-6 py-4 border-t border-border">
              <div className="text-sm text-muted-foreground">
                Total categories: {totalCategories}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
