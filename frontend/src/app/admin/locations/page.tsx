"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useRequireAdmin } from "@/hooks/useAuth";
import { extractErrorMessage } from "@/lib/error-utils";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TransportLocation {
  id: string;
  locationName: string;
  county?: string;
  transportCost: number;
  isFree: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function LocationsManagement() {
  const router = useRouter();
  const { user, loading, isAdmin } = useRequireAdmin();

  const [locations, setLocations] = useState<TransportLocation[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [freeFilter, setFreeFilter] = useState<"all" | "free" | "paid">("all");
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [error, setError] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; description: string; onConfirm: () => void }>({ open: false, title: "", description: "", onConfirm: () => {} });

  useEffect(() => {
    const fetchLocations = async () => {
      if (!isAdmin) return;

      setLoadingLocations(true);
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
        if (statusFilter === "inactive") {
          params.append("include_inactive", "true");
        }

        const response = await axios.get<TransportLocation[]>(
          `${apiUrl}/api/admin/locations?${params}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        let filteredLocations = response.data;

        // Apply client-side filters
        if (statusFilter === "active") {
          filteredLocations = filteredLocations.filter(loc => loc.isActive);
        } else if (statusFilter === "inactive") {
          filteredLocations = filteredLocations.filter(loc => !loc.isActive);
        }

        if (freeFilter === "free") {
          filteredLocations = filteredLocations.filter(loc => loc.isFree);
        } else if (freeFilter === "paid") {
          filteredLocations = filteredLocations.filter(loc => !loc.isFree);
        }

        if (search) {
          const searchLower = search.toLowerCase();
          filteredLocations = filteredLocations.filter(
            loc =>
              loc.locationName.toLowerCase().includes(searchLower) ||
              loc.county?.toLowerCase().includes(searchLower)
          );
        }

        setLocations(filteredLocations);
      } catch (err: any) {
        console.error("Error fetching locations:", err);
        setError(extractErrorMessage(err, "Failed to load locations"));
      } finally {
        setLoadingLocations(false);
      }
    };

    fetchLocations();
  }, [isAdmin, statusFilter, freeFilter, search]);

  const handleToggleActive = async (locationId: string, currentStatus: boolean) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const session = await fetch("/api/auth/session").then(res => res.json());
      const token = session?.accessToken;

      if (!token) return;

      await axios.put(
        `${apiUrl}/api/admin/locations/${locationId}`,
        { isActive: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Refresh locations
      window.location.reload();
    } catch (err) {
      console.error("Error toggling location status:", err);
      toast.error("Failed to update location status");
    }
  };

  const handleToggleFree = async (locationId: string, currentStatus: boolean) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const session = await fetch("/api/auth/session").then(res => res.json());
      const token = session?.accessToken;

      if (!token) return;

      await axios.put(
        `${apiUrl}/api/admin/locations/${locationId}`,
        { isFree: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Refresh locations
      window.location.reload();
    } catch (err) {
      console.error("Error toggling free status:", err);
      toast.error("Failed to update free status");
    }
  };

  const handleDeleteLocation = (locationId: string, name: string) => {
    setConfirmDialog({
      open: true,
      title: "Delete Location",
      description: `Are you sure you want to delete "${name}"? This will fail if there are bookings using this location.`,
      onConfirm: async () => {
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
          const session = await fetch("/api/auth/session").then(res => res.json());
          const token = session?.accessToken;

          if (!token) return;

          await axios.delete(
            `${apiUrl}/api/admin/locations/${locationId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          // Refresh locations
          window.location.reload();
        } catch (err: any) {
          console.error("Error deleting location:", err);
          toast.error(extractErrorMessage(err, "Failed to delete location"));
        }
      },
    });
  };

  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setFreeFilter("all");
  };

  const formatPrice = (price: number) => {
    return `KES ${price.toLocaleString()}`;
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
          <h1 className="text-3xl font-bold text-foreground">Transport Locations</h1>
          <p className="text-muted-foreground mt-1">
            Manage locations and transport pricing
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => router.push("/admin/locations/new")}
        >
          Add Location
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="locationSearch">
              Search
            </Label>
            <Input
              id="locationSearch"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search locations..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="statusFilter">
              Status
            </Label>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as "all" | "active" | "inactive")}
            >
              <SelectTrigger id="statusFilter" className="w-full">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="freeFilter">
              Transport Cost
            </Label>
            <Select
              value={freeFilter}
              onValueChange={(value) => setFreeFilter(value as "all" | "free" | "paid")}
            >
              <SelectTrigger id="freeFilter" className="w-full">
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="free">Free Transport</SelectItem>
                <SelectItem value="paid">Paid Transport</SelectItem>
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

      {/* Locations Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {error && (
          <div className="bg-destructive/10 border-l-4 border-destructive text-destructive px-4 py-3">
            {error}
          </div>
        )}

        {loadingLocations ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary"></div>
          </div>
        ) : locations.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No locations found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Location Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">County</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Transport Cost</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Free Transport</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Status</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {locations.map((location) => (
                  <tr key={location.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{location.locationName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-foreground">
                        {location.county || "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-foreground font-medium">
                        {location.isFree ? (
                          <span className="text-green-600">FREE</span>
                        ) : (
                          formatPrice(location.transportCost)
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleToggleFree(location.id, location.isFree)}
                        className={
                          location.isFree
                            ? "bg-green-100 text-green-800 hover:bg-green-200"
                            : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                        }
                      >
                        {location.isFree ? "Yes" : "No"}
                      </Button>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                          location.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {location.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => router.push(`/admin/locations/${location.id}`)}
                          className="text-secondary hover:text-secondary/80"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(location.id, location.isActive)}
                        >
                          {location.isActive ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteLocation(location.id, location.locationName)}
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
            <div className="bg-muted px-6 py-4 border-t border-border">
              <div className="text-sm text-muted-foreground">
                Total locations: {locations.length}
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({...prev, open}))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={confirmDialog.onConfirm}
        confirmLabel="Delete"
      />
    </div>
  );
}
