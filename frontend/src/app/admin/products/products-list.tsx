"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useRequireAdmin } from "@/hooks/useAuth";
import { extractErrorMessage } from "@/lib/error-utils";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface Brand {
  id: string;
  name: string;
  slug: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Product {
  id: string;
  title: string;
  slug: string;
  description?: string;
  base_price: number;
  final_price: number;
  discount_type?: string;
  discount_value?: number;
  inventory_count: number;
  low_stock_threshold: number;
  is_active: boolean;
  is_featured: boolean;
  in_stock: boolean;
  is_low_stock: boolean;
  sku?: string;
  tags?: string[];
  brand?: Brand;
  category?: Category;
  created_at: string;
  updated_at: string;
}

interface ProductListResponse {
  items: Product[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export function ProductsList() {
  const router = useRouter();
  const { user, loading, isAdmin } = useRequireAdmin();

  const [products, setProducts] = useState<Product[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [stockFilter, setStockFilter] = useState<"all" | "in_stock" | "low_stock" | "out_of_stock">("all");

  const [loadingProducts, setLoadingProducts] = useState(false);
  const [error, setError] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({ open: false, title: "", description: "", onConfirm: () => {} });

  // Fetch brands and categories for filters
  useEffect(() => {
    const fetchFiltersData = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const session = await fetch("/api/auth/session").then(res => res.json());
        const token = session?.accessToken;

        if (!token) return;

        const headers = { Authorization: `Bearer ${token}` };

        // Fetch brands (no pagination, get all)
        const brandsRes = await axios.get(`${apiUrl}/api/admin/brands?page_size=100`, { headers });
        setBrands(brandsRes.data.items || []);

        // Fetch categories (no pagination, get all)
        const categoriesRes = await axios.get(`${apiUrl}/api/admin/categories?page_size=100`, { headers });
        setCategories(categoriesRes.data.items || []);
      } catch (err) {
        console.error("Error fetching filter data:", err);
      }
    };

    if (isAdmin) {
      fetchFiltersData();
    }
  }, [isAdmin]);

  // Fetch products with filters
  useEffect(() => {
    const fetchProducts = async () => {
      if (!isAdmin) return;

      setLoadingProducts(true);
      setError("");

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const session = await fetch("/api/auth/session").then(res => res.json());
        const token = session?.accessToken;

        if (!token) {
          setError("Authentication required");
          return;
        }

        const params = new URLSearchParams({
          page: currentPage.toString(),
          page_size: pageSize.toString(),
        });

        if (search) params.append("search", search);
        if (selectedBrand) params.append("brand_id", selectedBrand);
        if (selectedCategory) params.append("category_id", selectedCategory);

        if (statusFilter === "active") params.append("is_active", "true");
        if (statusFilter === "inactive") params.append("is_active", "false");

        if (stockFilter === "in_stock") params.append("in_stock_only", "true");

        const response = await axios.get<ProductListResponse>(
          `${apiUrl}/api/admin/products?${params}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        let filteredItems = response.data.items;

        // Apply client-side stock filters
        if (stockFilter === "low_stock") {
          filteredItems = filteredItems.filter(p => p.is_low_stock);
        } else if (stockFilter === "out_of_stock") {
          filteredItems = filteredItems.filter(p => !p.in_stock);
        }

        setProducts(filteredItems);
        setTotalProducts(response.data.total);
        setCurrentPage(response.data.page);
        setTotalPages(response.data.total_pages);
      } catch (err: any) {
        console.error("Error fetching products:", err);
        setError(extractErrorMessage(err, "Failed to load products"));
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, [isAdmin, currentPage, pageSize, search, selectedBrand, selectedCategory, statusFilter, stockFilter]);

  const handleToggleActive = async (productId: string, currentStatus: boolean) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const session = await fetch("/api/auth/session").then(res => res.json());
      const token = session?.accessToken;

      if (!token) return;

      await axios.put(
        `${apiUrl}/api/admin/products/${productId}`,
        { is_active: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Refresh products
      setProducts(products.map(p =>
        p.id === productId ? { ...p, is_active: !currentStatus } : p
      ));
    } catch (err) {
      console.error("Error toggling product status:", err);
      toast.error("Failed to update product status");
    }
  };

  const handleDeleteProduct = (productId: string, title: string) => {
    setConfirmDialog({
      open: true,
      title: `Delete "${title}"`,
      description: `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
          const session = await fetch("/api/auth/session").then(res => res.json());
          const token = session?.accessToken;

          if (!token) return;

          await axios.delete(
            `${apiUrl}/api/admin/products/${productId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          // Refresh products
          setProducts(products.filter(p => p.id !== productId));
          setTotalProducts(totalProducts - 1);
        } catch (err: any) {
          console.error("Error deleting product:", err);
          toast.error(extractErrorMessage(err, "Failed to delete product"));
        }
      },
    });
  };

  const handleClearFilters = () => {
    setSearch("");
    setSelectedBrand("");
    setSelectedCategory("");
    setStatusFilter("all");
    setStockFilter("all");
    setCurrentPage(1);
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Products</h1>
          <p className="text-muted-foreground mt-1">
            Manage your product catalog
          </p>
        </div>
        <button
          onClick={() => router.push("/admin/products/new")}
          className="bg-secondary hover:bg-secondary/90 text-foreground px-6 py-2 rounded-lg font-medium transition-colors"
        >
          Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Search
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search products..."
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
            />
          </div>

          {/* Brand Filter */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Brand
            </label>
            <select
              value={selectedBrand}
              onChange={(e) => {
                setSelectedBrand(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
            >
              <option value="">All Brands</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Stock Level Filter */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Stock Level
            </label>
            <select
              value={stockFilter}
              onChange={(e) => {
                setStockFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
            >
              <option value="all">All Stock Levels</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>

          {/* Clear Filters Button */}
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

      {/* Products Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {error && (
          <div className="bg-destructive/10 border-l-4 border-destructive text-destructive px-4 py-3">
            {error}
          </div>
        )}

        {loadingProducts ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No products found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted border-b border-border">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">
                      Brand
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-foreground">{product.title}</div>
                          {product.sku && (
                            <div className="text-sm text-muted-foreground">SKU: {product.sku}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {product.brand?.name || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {product.category?.name || "-"}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-foreground">
                            KES {product.final_price.toLocaleString()}
                          </div>
                          {product.discount_value && (
                            <div className="text-sm text-muted-foreground line-through">
                              KES {product.base_price.toLocaleString()}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${
                            product.is_low_stock
                              ? "text-orange-600"
                              : !product.in_stock
                              ? "text-red-600"
                              : "text-green-600"
                          }`}>
                            {product.inventory_count}
                          </span>
                          {product.is_low_stock && (
                            <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded">
                              Low
                            </span>
                          )}
                          {!product.in_stock && (
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">
                              Out
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                            product.is_active
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {product.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => router.push(`/admin/products/${product.id}`)}
                            className="text-secondary hover:text-secondary/80"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggleActive(product.id, product.is_active)}
                            className="text-foreground hover:text-foreground/80"
                          >
                            {product.is_active ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id, product.title)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="bg-muted px-6 py-4 border-t border-border flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {products.length} of {totalProducts} products
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-border rounded hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed text-foreground"
                >
                  Previous
                </button>
                <span className="px-4 py-1 text-sm text-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-border rounded hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed text-foreground"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={confirmDialog.onConfirm}
        confirmLabel="Delete"
      />
    </div>
  );
}
