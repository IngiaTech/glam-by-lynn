"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useRequireAdmin } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { extractErrorMessage } from "@/lib/error-utils";
import {
  UserCog,
  UserX,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface User {
  id: string;
  email: string;
  fullName?: string;
  isAdmin: boolean;
  adminRole?: string;
  isActive: boolean;
  createdAt: string;
}

export default function AdminUsersPage() {
  const { isAdmin, loading: authLoading } = useRequireAdmin();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [adminFilter, setAdminFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Role assignment modal
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [updatingRole, setUpdatingRole] = useState(false);

  // Revoke admin modal
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [revokingAdmin, setRevokingAdmin] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin, currentPage, adminFilter, searchQuery]);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      const session = await fetch("/api/auth/session").then(res => res.json());
      const token = session?.accessToken;

      if (!token) {
        setError("Authentication required");
        return;
      }

      const params: any = {
        page: currentPage,
        page_size: pageSize,
      };

      if (adminFilter !== "all") {
        params.isAdmin = adminFilter === "admin";
      }

      if (searchQuery) {
        params.search = searchQuery;
      }

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/users`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params,
        }
      );

      setUsers(response.data.items);
      setTotal(response.data.total);
      setTotalPages(response.data.totalPages);
    } catch (err: any) {
      console.error("Error fetching users:", err);
      setError(extractErrorMessage(err, "Failed to load users"));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setSearchQuery(searchInput);
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSearchQuery("");
    setCurrentPage(1);
  };

  const openRoleModal = (user: User) => {
    setSelectedUser(user);
    setSelectedRole(user.adminRole || "product_manager");
    setRoleModalOpen(true);
  };

  const openRevokeModal = (user: User) => {
    setSelectedUser(user);
    setRevokeModalOpen(true);
  };

  const handleAssignRole = async () => {
    if (!selectedUser) return;

    setUpdatingRole(true);
    setError("");

    try {
      const session = await fetch("/api/auth/session").then(res => res.json());
      const token = session?.accessToken;

      if (!token) {
        setError("Authentication required");
        return;
      }

      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/${selectedUser.id}/role`,
        {
          isAdmin: true,
          adminRole: selectedRole,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setRoleModalOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err: any) {
      console.error("Error assigning role:", err);
      setError(extractErrorMessage(err, "Failed to assign role"));
    } finally {
      setUpdatingRole(false);
    }
  };

  const handleRevokeAdmin = async () => {
    if (!selectedUser) return;

    setRevokingAdmin(true);
    setError("");

    try {
      const session = await fetch("/api/auth/session").then(res => res.json());
      const token = session?.accessToken;

      if (!token) {
        setError("Authentication required");
        return;
      }

      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/${selectedUser.id}/admin`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setRevokeModalOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err: any) {
      console.error("Error revoking admin:", err);
      setError(extractErrorMessage(err, "Failed to revoke admin access"));
    } finally {
      setRevokingAdmin(false);
    }
  };

  const getRoleBadgeVariant = (role?: string) => {
    switch (role) {
      case "super_admin":
        return "destructive";
      case "product_manager":
        return "default";
      case "booking_manager":
        return "secondary";
      case "content_editor":
        return "outline";
      case "artist":
        return "default";
      default:
        return "outline";
    }
  };

  const formatRoleName = (role?: string) => {
    if (!role) return "No Role";
    return role
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (authLoading || loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground">
          Manage user accounts and admin roles
        </p>
      </div>

      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="adminFilter">Admin Status</Label>
              <Select
                value={adminFilter}
                onValueChange={(value) => {
                  setAdminFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger id="adminFilter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="admin">Admins Only</SelectItem>
                  <SelectItem value="user">Regular Users</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="search">Search by Email or Name</Label>
              <div className="flex gap-2">
                <Input
                  id="search"
                  placeholder="Enter email or name..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearch();
                    }
                  }}
                />
                <Button onClick={handleSearch} size="icon">
                  <Search className="h-4 w-4" />
                </Button>
                {searchQuery && (
                  <Button onClick={handleClearSearch} variant="outline">
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Users ({total} total)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="pb-3 text-left font-medium">Email</th>
                  <th className="pb-3 text-left font-medium">Name</th>
                  <th className="pb-3 text-left font-medium">Admin Status</th>
                  <th className="pb-3 text-left font-medium">Role</th>
                  <th className="pb-3 text-left font-medium">Created</th>
                  <th className="pb-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="border-b">
                      <td className="py-4">
                        <div className="font-mono text-sm">{user.email}</div>
                      </td>
                      <td className="py-4">
                        {user.fullName || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-4">
                        <Badge variant={user.isAdmin ? "default" : "outline"}>
                          {user.isAdmin ? "Admin" : "User"}
                        </Badge>
                      </td>
                      <td className="py-4">
                        {user.adminRole ? (
                          <Badge variant={getRoleBadgeVariant(user.adminRole)}>
                            {formatRoleName(user.adminRole)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-4 text-sm text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openRoleModal(user)}
                          >
                            <UserCog className="h-4 w-4 mr-1" />
                            {user.isAdmin ? "Change Role" : "Make Admin"}
                          </Button>
                          {user.isAdmin && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openRevokeModal(user)}
                            >
                              <UserX className="h-4 w-4 mr-1" />
                              Revoke
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Assignment Modal */}
      <Dialog open={roleModalOpen} onOpenChange={setRoleModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedUser?.isAdmin ? "Change Admin Role" : "Assign Admin Role"}
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.isAdmin
                ? `Update the admin role for ${selectedUser?.email}`
                : `Grant admin access to ${selectedUser?.email} and assign a role`}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="role">Admin Role</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="product_manager">Product Manager</SelectItem>
                <SelectItem value="booking_manager">Booking Manager</SelectItem>
                <SelectItem value="content_editor">Content Editor</SelectItem>
                <SelectItem value="artist">Artist</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-2 text-sm text-muted-foreground">
              {selectedRole === "super_admin" &&
                "Full system access with all permissions"}
              {selectedRole === "product_manager" &&
                "Manage products, categories, and inventory"}
              {selectedRole === "booking_manager" &&
                "Manage bookings and appointments"}
              {selectedRole === "content_editor" &&
                "Manage content, testimonials, and gallery"}
              {selectedRole === "artist" && "Manage own bookings and portfolio"}
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRoleModalOpen(false)}
              disabled={updatingRole}
            >
              Cancel
            </Button>
            <Button onClick={handleAssignRole} disabled={updatingRole}>
              {updatingRole ? "Updating..." : "Assign Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Admin Modal */}
      <Dialog open={revokeModalOpen} onOpenChange={setRevokeModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Admin Access</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke admin access from{" "}
              <strong>{selectedUser?.email}</strong>? They will become a regular
              user and lose all admin privileges.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRevokeModalOpen(false)}
              disabled={revokingAdmin}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevokeAdmin}
              disabled={revokingAdmin}
            >
              {revokingAdmin ? "Revoking..." : "Revoke Access"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
