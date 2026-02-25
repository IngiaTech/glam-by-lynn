"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useRequireAdmin } from "@/hooks/useAuth";
import { ClassEnrollment, MakeupClass, PaginatedResponse } from "@/types";
import { API_BASE_URL, API_ENDPOINTS } from "@/config/api";
import { extractErrorMessage } from "@/lib/error-utils";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ENROLLMENT_STATUSES = [
  { value: "pending", label: "Pending", color: "bg-yellow-100 text-yellow-800" },
  { value: "contacted", label: "Contacted", color: "bg-blue-100 text-blue-800" },
  { value: "confirmed", label: "Confirmed", color: "bg-green-100 text-green-800" },
  { value: "completed", label: "Completed", color: "bg-gray-100 text-gray-800" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-100 text-red-800" },
];

export function EnrollmentsList() {
  const { loading, isAdmin } = useRequireAdmin();

  const [enrollments, setEnrollments] = useState<ClassEnrollment[]>([]);
  const [totalEnrollments, setTotalEnrollments] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  const [classes, setClasses] = useState<MakeupClass[]>([]);

  // Filters
  const [selectedClass, setSelectedClass] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [emailSearch, setEmailSearch] = useState("");

  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [error, setError] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({ open: false, title: "", description: "", onConfirm: () => {} });

  // Fetch classes for filter dropdown
  useEffect(() => {
    const fetchClasses = async () => {
      if (!isAdmin) return;

      try {
        const session = await fetch("/api/auth/session").then((res) => res.json());
        const token = session?.accessToken;

        if (!token) return;

        const response = await axios.get<PaginatedResponse<MakeupClass>>(
          `${API_BASE_URL}${API_ENDPOINTS.ADMIN_CLASSES.LIST}?pageSize=100`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setClasses(response.data.items);
      } catch (err) {
        console.error("Error fetching classes:", err);
      }
    };

    fetchClasses();
  }, [isAdmin]);

  // Fetch enrollments
  useEffect(() => {
    const fetchEnrollments = async () => {
      if (!isAdmin) return;

      setLoadingEnrollments(true);
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

        if (selectedClass) params.append("classId", selectedClass);
        if (statusFilter) params.append("status", statusFilter);
        if (emailSearch) params.append("email", emailSearch);

        const response = await axios.get<PaginatedResponse<ClassEnrollment>>(
          `${API_BASE_URL}${API_ENDPOINTS.ADMIN_CLASSES.ENROLLMENTS.LIST}?${params}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setEnrollments(response.data.items);
        setTotalEnrollments(response.data.total);
        setCurrentPage(response.data.page);
        setTotalPages(response.data.total_pages);
      } catch (err: unknown) {
        console.error("Error fetching enrollments:", err);
        setError(extractErrorMessage(err, "Failed to load enrollments"));
      } finally {
        setLoadingEnrollments(false);
      }
    };

    fetchEnrollments();
  }, [isAdmin, currentPage, selectedClass, statusFilter, emailSearch]);

  const handleStatusChange = async (enrollmentId: string, newStatus: string) => {
    try {
      const session = await fetch("/api/auth/session").then((res) => res.json());
      const token = session?.accessToken;

      if (!token) return;

      await axios.put(
        `${API_BASE_URL}${API_ENDPOINTS.ADMIN_CLASSES.ENROLLMENTS.STATUS(enrollmentId)}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setEnrollments(
        enrollments.map((e) =>
          e.id === enrollmentId ? { ...e, status: newStatus as ClassEnrollment["status"] } : e
        )
      );
    } catch (err) {
      console.error("Error updating status:", err);
      toast.error("Failed to update enrollment status");
    }
  };

  const handleDeleteEnrollment = (enrollmentId: string, name: string) => {
    setConfirmDialog({
      open: true,
      title: `Delete enrollment for "${name}"`,
      description: `Are you sure you want to delete enrollment for "${name}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          const session = await fetch("/api/auth/session").then((res) => res.json());
          const token = session?.accessToken;

          if (!token) return;

          await axios.delete(
            `${API_BASE_URL}${API_ENDPOINTS.ADMIN_CLASSES.ENROLLMENTS.DELETE(enrollmentId)}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          setEnrollments(enrollments.filter((e) => e.id !== enrollmentId));
          setTotalEnrollments(totalEnrollments - 1);
        } catch (err: unknown) {
          console.error("Error deleting enrollment:", err);
          toast.error(extractErrorMessage(err, "Failed to delete enrollment"));
        }
      },
    });
  };

  const handleExportCSV = async () => {
    try {
      const session = await fetch("/api/auth/session").then((res) => res.json());
      const token = session?.accessToken;

      if (!token) return;

      const params = new URLSearchParams();
      if (selectedClass) params.append("classId", selectedClass);
      if (statusFilter) params.append("status", statusFilter);

      const response = await axios.get(
        `${API_BASE_URL}${API_ENDPOINTS.ADMIN_CLASSES.ENROLLMENTS.EXPORT_CSV}?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "enrollments.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Error exporting CSV:", err);
      toast.error("Failed to export CSV");
    }
  };

  const handleClearFilters = () => {
    setSelectedClass("");
    setStatusFilter("");
    setEmailSearch("");
    setCurrentPage(1);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = ENROLLMENT_STATUSES.find((s) => s.value === status);
    return statusConfig ? (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${statusConfig.color}`}>
        {statusConfig.label}
      </span>
    ) : (
      <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800">
        {status}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
          <h2 className="text-2xl font-bold text-foreground">Enrollments</h2>
          <p className="text-muted-foreground mt-1">
            Manage class enrollment requests
          </p>
        </div>
        <Button
          onClick={handleExportCSV}
          className="bg-secondary hover:bg-secondary/90 text-foreground"
        >
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Class Filter */}
          <div className="space-y-2">
            <Label>Class</Label>
            <Select
              value={selectedClass || "all"}
              onValueChange={(value) => {
                setSelectedClass(value === "all" ? "" : value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={statusFilter || "all"}
              onValueChange={(value) => {
                setStatusFilter(value === "all" ? "" : value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {ENROLLMENT_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Email Search */}
          <div className="space-y-2">
            <Label>Email Search</Label>
            <Input
              type="text"
              value={emailSearch}
              onChange={(e) => {
                setEmailSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by email..."
            />
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

      {/* Enrollments Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {error && (
          <div className="bg-destructive/10 border-l-4 border-destructive text-destructive px-4 py-3">
            {error}
          </div>
        )}

        {loadingEnrollments ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary"></div>
          </div>
        ) : enrollments.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No enrollments found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted border-b border-border">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">
                      Enrollment #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">
                      Class
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {enrollments.map((enrollment) => (
                    <tr key={enrollment.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm">{enrollment.enrollmentNumber}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-foreground">{enrollment.fullName}</div>
                          <div className="text-sm text-muted-foreground">{enrollment.email}</div>
                          <div className="text-sm text-muted-foreground">{enrollment.phone}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {enrollment.makeupClass?.title || "N/A"}
                      </td>
                      <td className="px-6 py-4">
                        <Select
                          value={enrollment.status}
                          onValueChange={(value) => handleStatusChange(enrollment.id, value)}
                        >
                          <SelectTrigger className="w-[130px] h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ENROLLMENT_STATUSES.map((status) => (
                              <SelectItem key={status.value} value={status.value}>
                                {status.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {formatDate(enrollment.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteEnrollment(enrollment.id, enrollment.fullName)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="bg-muted px-6 py-4 border-t border-border flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {enrollments.length} of {totalEnrollments} enrollments
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
