"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useRequireAdmin } from "@/hooks/useAuth";
import { ClassEnrollment, MakeupClass, PaginatedResponse } from "@/types";
import { API_BASE_URL, API_ENDPOINTS } from "@/config/api";
import { extractErrorMessage } from "@/lib/error-utils";

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
      alert("Failed to update enrollment status");
    }
  };

  const handleDeleteEnrollment = async (enrollmentId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete enrollment for "${name}"? This action cannot be undone.`)) {
      return;
    }

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
      alert(extractErrorMessage(err, "Failed to delete enrollment"));
    }
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
      alert("Failed to export CSV");
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
        <button
          onClick={handleExportCSV}
          className="bg-secondary hover:bg-secondary/90 text-foreground px-6 py-2 rounded-lg font-medium transition-colors"
        >
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Class Filter */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Class
            </label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
            >
              <option value="">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.title}
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
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
            >
              <option value="">All Statuses</option>
              {ENROLLMENT_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          {/* Email Search */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Email Search
            </label>
            <input
              type="text"
              value={emailSearch}
              onChange={(e) => {
                setEmailSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by email..."
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
            />
          </div>

          {/* Clear Filters */}
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
                        <select
                          value={enrollment.status}
                          onChange={(e) => handleStatusChange(enrollment.id, e.target.value)}
                          className="px-2 py-1 border border-border rounded text-sm bg-background focus:outline-none focus:ring-2 focus:ring-secondary"
                        >
                          {ENROLLMENT_STATUSES.map((status) => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {formatDate(enrollment.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <button
                          onClick={() => handleDeleteEnrollment(enrollment.id, enrollment.fullName)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
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
    </div>
  );
}
