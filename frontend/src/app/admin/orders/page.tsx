"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { getUserOrders, formatCurrency, formatDateTime, formatStatus } from "@/lib/orders";
import { extractErrorMessage } from "@/lib/error-utils";
import type { Order } from "@/types";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending", color: "bg-yellow-100 text-yellow-800" },
  { value: "payment_confirmed", label: "Payment Confirmed", color: "bg-blue-100 text-blue-800" },
  { value: "processing", label: "Processing", color: "bg-purple-100 text-purple-800" },
  { value: "shipped", label: "Shipped", color: "bg-indigo-100 text-indigo-800" },
  { value: "delivered", label: "Delivered", color: "bg-green-100 text-green-800" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-100 text-red-800" },
];

export default function AdminOrdersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState("");

  // Pagination
  const [skip, setSkip] = useState(0);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);

  // Redirect if not admin
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated" && !session?.user?.isAdmin) {
      router.push("/");
    }
  }, [status, session, router]);

  // Load orders
  useEffect(() => {
    if (status === "authenticated" && session?.user?.isAdmin) {
      loadOrders();
    }
  }, [status, session, skip]);

  const loadOrders = async () => {
    if (!session?.accessToken) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getUserOrders(session?.accessToken, skip, limit);

      // Filter by status if selected
      const filteredOrders = statusFilter
        ? data.orders.filter((order) => order.status === statusFilter)
        : data.orders;

      setOrders(filteredOrders);
      setTotal(data.total);
    } catch (err: any) {
      console.error("Error loading orders:", err);
      setError(err.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (statusValue: string) => {
    const statusOption = STATUS_OPTIONS.find((s) => s.value === statusValue);
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusOption?.color || "bg-gray-100"}`}>
        {statusOption?.label || formatStatus(statusValue)}
      </span>
    );
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session?.user?.isAdmin) {
    return null;
  }

  const currentPage = Math.floor(skip / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Order Management</h1>
            <p className="text-muted-foreground mt-1">Manage all customer orders</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card p-4 rounded-lg border mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setSkip(0);
                }}
                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-secondary"
              >
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setStatusFilter("");
                  setSkip(0);
                  loadOrders();
                }}
                className="w-full px-4 py-2 border rounded hover:bg-accent transition-colors"
              >
                Clear & Reload
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive">
            {error}
          </div>
        )}

        {loading && (
          <div className="text-center py-8 text-muted-foreground">Loading orders...</div>
        )}

        {!loading && orders.length === 0 && (
          <div className="text-center py-12 bg-card rounded-lg border">
            <p className="text-muted-foreground">No orders found</p>
          </div>
        )}

        {!loading && orders.length > 0 && (
          <>
            <div className="bg-card rounded-lg border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">Order #</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Customer</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Payment</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Total</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className="border-t hover:bg-accent/5">
                        <td className="px-4 py-3">
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowDetailsModal(true);
                            }}
                            className="text-secondary hover:underline font-medium"
                          >
                            {order.orderNumber}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <div className="font-medium">
                              {order.guestName || `User ${order.userId}`}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {order.guestEmail || order.guestPhone}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(order.status)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              order.paymentConfirmed
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {order.paymentConfirmed ? "Confirmed" : "Pending"}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium">
                          KES {(order.totalAmount || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowDetailsModal(true);
                            }}
                            className="px-3 py-1 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90 text-sm"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {skip + 1} - {Math.min(skip + limit, total)} of {total} orders
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSkip(Math.max(0, skip - limit))}
                  disabled={skip === 0}
                  className="px-4 py-2 border rounded hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <div className="px-4 py-2">
                  Page {currentPage} of {totalPages}
                </div>
                <button
                  onClick={() => setSkip(skip + limit)}
                  disabled={skip + limit >= total}
                  className="px-4 py-2 border rounded hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}

        {/* Order Details Modal */}
        {showDetailsModal && selectedOrder && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">Order Details</h2>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Order Number</div>
                      <div className="font-medium">{selectedOrder.orderNumber}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Status</div>
                      <div>{getStatusBadge(selectedOrder.status)}</div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2">Customer Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Name</div>
                        <div>{selectedOrder.guestName || "N/A"}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Email</div>
                        <div>{selectedOrder.guestEmail || "N/A"}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Phone</div>
                        <div>{selectedOrder.guestPhone || "N/A"}</div>
                      </div>
                    </div>
                  </div>

                  {selectedOrder.deliveryAddress && (
                    <div className="border-t pt-4">
                      <h3 className="font-semibold mb-2">Delivery Address</h3>
                      <div>{selectedOrder.deliveryAddress}</div>
                      {selectedOrder.deliveryTown && <div>{selectedOrder.deliveryTown}</div>}
                      {selectedOrder.deliveryCounty && <div>{selectedOrder.deliveryCounty}</div>}
                    </div>
                  )}

                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2">Pricing</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>KES {(selectedOrder.subtotal || 0).toLocaleString()}</span>
                      </div>
                      {selectedOrder.discountAmount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Discount:</span>
                          <span>-KES {selectedOrder.discountAmount.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Delivery Fee:</span>
                        <span>KES {(selectedOrder.deliveryFee || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total:</span>
                        <span>KES {(selectedOrder.totalAmount || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2">Payment Information</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Payment Method:</span>
                        <span>{selectedOrder.paymentMethod || "N/A"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Payment Status:</span>
                        <span className={selectedOrder.paymentConfirmed ? "text-green-600" : "text-yellow-600"}>
                          {selectedOrder.paymentConfirmed ? "Confirmed ✓" : "Pending"}
                        </span>
                      </div>
                      {selectedOrder.paymentConfirmedAt && (
                        <div className="flex justify-between">
                          <span>Confirmed At:</span>
                          <span>{formatDateTime(selectedOrder.paymentConfirmedAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedOrder.trackingNumber && (
                    <div className="border-t pt-4">
                      <div className="text-sm text-muted-foreground">Tracking Number</div>
                      <div className="font-mono">{selectedOrder.trackingNumber}</div>
                    </div>
                  )}

                  <div className="border-t pt-4 text-sm text-muted-foreground">
                    <div>Created: {formatDateTime(selectedOrder.createdAt)}</div>
                    <div>Updated: {formatDateTime(selectedOrder.updatedAt)}</div>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="flex-1 px-4 py-2 border rounded hover:bg-accent transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
