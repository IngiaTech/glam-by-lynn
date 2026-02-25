"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useRequireAdmin } from "@/hooks/useAuth";
import { MakeupClass, PaginatedResponse } from "@/types";
import { API_BASE_URL, API_ENDPOINTS } from "@/config/api";
import { extractErrorMessage } from "@/lib/error-utils";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SKILL_LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const TOPICS = [
  { value: "bridal", label: "Bridal" },
  { value: "everyday", label: "Everyday" },
  { value: "special_effects", label: "Special Effects" },
  { value: "editorial", label: "Editorial" },
  { value: "corrective", label: "Corrective" },
  { value: "stage_theater", label: "Stage/Theater" },
  { value: "airbrush", label: "Airbrush" },
  { value: "contouring", label: "Contouring" },
  { value: "eye_makeup", label: "Eye Makeup" },
  { value: "other", label: "Other" },
];

export function ClassesList() {
  const router = useRouter();
  const { loading, isAdmin } = useRequireAdmin();

  const [classes, setClasses] = useState<MakeupClass[]>([]);
  const [totalClasses, setTotalClasses] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  // Filters
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [loadingClasses, setLoadingClasses] = useState(false);
  const [error, setError] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({ open: false, title: "", description: "", onConfirm: () => {} });

  useEffect(() => {
    const fetchClasses = async () => {
      if (!isAdmin) return;

      setLoadingClasses(true);
      setError("");

      try {
        const session = await fetch("/api/auth/session").then((res) => res.json());
        const token = session?.accessToken;

        if (!token) {
          setError("Authentication required");
          return;
        }

        const params = new URLSearchParams({
          page: currentPage.toString(),
          pageSize: pageSize.toString(),
        });

        if (selectedLevel) params.append("skillLevel", selectedLevel);
        if (selectedTopic) params.append("topic", selectedTopic);
        if (statusFilter === "active") params.append("isActive", "true");
        if (statusFilter === "inactive") params.append("isActive", "false");

        const response = await axios.get<PaginatedResponse<MakeupClass>>(
          `${API_BASE_URL}${API_ENDPOINTS.ADMIN_CLASSES.LIST}?${params}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setClasses(response.data.items);
        setTotalClasses(response.data.total);
        setCurrentPage(response.data.page);
        setTotalPages(response.data.total_pages);
      } catch (err: unknown) {
        console.error("Error fetching classes:", err);
        setError(extractErrorMessage(err, "Failed to load classes"));
      } finally {
        setLoadingClasses(false);
      }
    };

    fetchClasses();
  }, [isAdmin, currentPage, selectedLevel, selectedTopic, statusFilter]);

  const handleToggleActive = async (classId: string, currentStatus: boolean) => {
    try {
      const session = await fetch("/api/auth/session").then((res) => res.json());
      const token = session?.accessToken;

      if (!token) return;

      await axios.put(
        `${API_BASE_URL}${API_ENDPOINTS.ADMIN_CLASSES.UPDATE(classId)}`,
        { isActive: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setClasses(
        classes.map((c) => (c.id === classId ? { ...c, isActive: !currentStatus } : c))
      );
    } catch (err) {
      console.error("Error toggling class status:", err);
      toast.error("Failed to update class status");
    }
  };

  const handleDeleteClass = (classId: string, title: string) => {
    setConfirmDialog({
      open: true,
      title: `Delete "${title}"`,
      description: `Are you sure you want to delete "${title}"? This will also delete all enrollments. This action cannot be undone.`,
      onConfirm: async () => {
        try {
          const session = await fetch("/api/auth/session").then((res) => res.json());
          const token = session?.accessToken;

          if (!token) return;

          await axios.delete(`${API_BASE_URL}${API_ENDPOINTS.ADMIN_CLASSES.DELETE(classId)}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          setClasses(classes.filter((c) => c.id !== classId));
          setTotalClasses(totalClasses - 1);
        } catch (err: unknown) {
          console.error("Error deleting class:", err);
          toast.error(extractErrorMessage(err, "Failed to delete class"));
        }
      },
    });
  };

  const handleClearFilters = () => {
    setSelectedLevel("");
    setSelectedTopic("");
    setStatusFilter("all");
    setCurrentPage(1);
  };

  const getSkillLevelLabel = (level: string) => {
    const skill = SKILL_LEVELS.find((s) => s.value === level);
    return skill?.label || level;
  };

  const getTopicLabel = (topic: string) => {
    const t = TOPICS.find((t) => t.value === topic);
    return t?.label || topic;
  };

  const formatPrice = (priceFrom?: number, priceTo?: number) => {
    if (!priceFrom && !priceTo) return "Contact";
    if (priceFrom && !priceTo) return `From KSh ${priceFrom.toLocaleString()}`;
    if (!priceFrom && priceTo) return `Up to KSh ${priceTo.toLocaleString()}`;
    if (priceFrom === priceTo) return `KSh ${priceFrom?.toLocaleString()}`;
    return `KSh ${priceFrom?.toLocaleString()} - ${priceTo?.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
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
          <h2 className="text-2xl font-bold text-foreground">Classes</h2>
          <p className="text-muted-foreground mt-1">
            Manage your makeup training classes
          </p>
        </div>
        <Button
          onClick={() => router.push("/admin/classes/new")}
          className="bg-secondary hover:bg-secondary/90 text-foreground"
        >
          Add Class
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Skill Level Filter */}
          <div className="space-y-2">
            <Label>Skill Level</Label>
            <Select
              value={selectedLevel || "all"}
              onValueChange={(value) => {
                setSelectedLevel(value === "all" ? "" : value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {SKILL_LEVELS.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Topic Filter */}
          <div className="space-y-2">
            <Label>Topic</Label>
            <Select
              value={selectedTopic || "all"}
              onValueChange={(value) => {
                setSelectedTopic(value === "all" ? "" : value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Topics" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Topics</SelectItem>
                {TOPICS.map((topic) => (
                  <SelectItem key={topic.value} value={topic.value}>
                    {topic.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <Label>Status</Label>
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

          {/* Clear Filters */}
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

      {/* Classes Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {error && (
          <div className="bg-destructive/10 border-l-4 border-destructive text-destructive px-4 py-3">
            {error}
          </div>
        )}

        {loadingClasses ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary"></div>
          </div>
        ) : classes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No classes found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted border-b border-border">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">
                      Class
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">
                      Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">
                      Topic
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">
                      Price
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
                  {classes.map((cls) => (
                    <tr key={cls.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-foreground">{cls.title}</div>
                          {cls.isFeatured && (
                            <span className="text-xs bg-secondary/20 text-secondary px-2 py-0.5 rounded">
                              Featured
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {getSkillLevelLabel(cls.skillLevel)}
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {getTopicLabel(cls.topic)}
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {cls.durationDays} {cls.durationDays === 1 ? "day" : "days"}
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {formatPrice(cls.priceFrom, cls.priceTo)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                            cls.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {cls.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/admin/classes/${cls.id}`)}
                            className="text-secondary hover:text-secondary/80"
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(cls.id, cls.isActive)}
                            className="text-foreground hover:text-foreground/80"
                          >
                            {cls.isActive ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClass(cls.id, cls.title)}
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
                Showing {classes.length} of {totalClasses} classes
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
