"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useRequireAdmin } from "@/hooks/useAuth";
import { extractErrorMessage } from "@/lib/error-utils";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Brand {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface BrandListResponse {
  items: Brand[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export function BrandsList() {
  const router = useRouter();
  const { user, loading, isAdmin } = useRequireAdmin();

  const [brands, setBrands] = useState<Brand[]>([]);
  const [totalBrands, setTotalBrands] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [loadingBrands, setLoadingBrands] = useState(false);
  const [error, setError] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({ open: false, title: "", description: "", onConfirm: () => {} });

  useEffect(() => {
    const fetchBrands = async () => {
      if (!isAdmin) return;

      setLoadingBrands(true);
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
        if (statusFilter === "active") params.append("is_active", "true");
        if (statusFilter === "inactive") params.append("is_active", "false");

        const response = await axios.get<BrandListResponse>(
          `${apiUrl}/api/admin/brands?${params}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setBrands(response.data.items);
        setTotalBrands(response.data.total);
        setCurrentPage(response.data.page);
        setTotalPages(response.data.total_pages);
      } catch (err: any) {
        console.error("Error fetching brands:", err);
        setError(extractErrorMessage(err, "Failed to load brands"));
      } finally {
        setLoadingBrands(false);
      }
    };

    fetchBrands();
  }, [isAdmin, currentPage, pageSize, search, statusFilter]);

  const handleToggleActive = async (brandId: string, currentStatus: boolean) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const session = await fetch("/api/auth/session").then(res => res.json());
      const token = session?.accessToken;

      if (!token) return;

      await axios.put(
        `${apiUrl}/api/admin/brands/${brandId}`,
        { is_active: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setBrands(brands.map(b =>
        b.id === brandId ? { ...b, is_active: !currentStatus } : b
      ));
    } catch (err) {
      console.error("Error toggling brand status:", err);
      toast.error("Failed to update brand status");
    }
  };

  const handleDeleteBrand = (brandId: string, name: string) => {
    setConfirmDialog({
      open: true,
      title: `Delete "${name}"`,
      description: `Are you sure you want to delete "${name}"? This will fail if there are products using this brand.`,
      onConfirm: async () => {
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
          const session = await fetch("/api/auth/session").then(res => res.json());
          const token = session?.accessToken;

          if (!token) return;

          await axios.delete(
            `${apiUrl}/api/admin/brands/${brandId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          setBrands(brands.filter(b => b.id !== brandId));
          setTotalBrands(totalBrands - 1);
        } catch (err: any) {
          console.error("Error deleting brand:", err);
          toast.error(extractErrorMessage(err, "Failed to delete brand"));
        }
      },
    });
  };

  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("all");
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Brands</h1>
          <p className="text-muted-foreground mt-1">
            Manage product brands
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => router.push("/admin/brands/new")}
        >
          Add Brand
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>
              Search
            </Label>
            <Input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search brands..."
            />
          </div>

          <div className="space-y-2">
            <Label>
              Status
            </Label>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value as "all" | "active" | "inactive");
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={handleClearFilters}
              className="w-full"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Brands Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {error && (
          <div className="bg-destructive/10 border-l-4 border-destructive text-destructive px-4 py-3">
            {error}
          </div>
        )}

        {loadingBrands ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary"></div>
          </div>
        ) : brands.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No brands found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted border-b border-border">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">
                      Brand
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">
                      Slug
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {brands.map((brand) => (
                    <tr key={brand.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {brand.logo_url && (
                            <img
                              src={brand.logo_url}
                              alt={brand.name}
                              className="h-10 w-10 object-contain rounded"
                            />
                          )}
                          <div>
                            <div className="font-medium text-foreground">{brand.name}</div>
                            {brand.description && (
                              <div className="text-sm text-muted-foreground line-clamp-1">
                                {brand.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {brand.slug}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                            brand.is_active
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {brand.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {new Date(brand.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => router.push(`/admin/brands/${brand.id}`)}
                            className="text-secondary hover:text-secondary/80"
                          >
                            Edit
                          </Button>
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => handleToggleActive(brand.id, brand.is_active)}
                            className="text-foreground hover:text-foreground/80"
                          >
                            {brand.is_active ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => handleDeleteBrand(brand.id, brand.name)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </Button>
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
                Showing {brands.length} of {totalBrands} brands
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="px-4 py-1 text-sm text-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
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
