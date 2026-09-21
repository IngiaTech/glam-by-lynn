"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRedirectWhenSignedOut } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { formatDateTime, formatStatus } from "@/lib/orders";
import {
  allowedNextStatuses,
  getAllOrders,
  setOrderDeliveryFee,
  updateOrderDetails,
  updateOrderStatus,
} from "@/lib/adminOrders";
import { extractErrorMessage } from "@/lib/error-utils";
import type { AdminOrder } from "@/types";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending", color: "bg-yellow-100 text-yellow-800" },
  { value: "payment_confirmed", label: "Payment Confirmed", color: "bg-blue-100 text-blue-800" },
  { value: "processing", label: "Processing", color: "bg-purple-100 text-purple-800" },
  { value: "shipped", label: "Shipped", color: "bg-indigo-100 text-indigo-800" },
  { value: "delivered", label: "Delivered", color: "bg-green-100 text-green-800" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-100 text-red-800" },
];

const statusLabel = (value: string) =>
  STATUS_OPTIONS.find((option) => option.value === value)?.label || formatStatus(value);

export default function AdminOrdersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Filters — applied server-side so pagination counts stay correct
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  // Pagination
  const [skip, setSkip] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Per-order action state, scoped to the details modal
  const [nextStatus, setNextStatus] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [deliveryFeeInput, setDeliveryFeeInput] = useState("");
  const [trackingInput, setTrackingInput] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  // A session that ends while here goes to the homepage (see
  // useRedirectWhenSignedOut). Anonymous visitors never reach this page: the
  // /admin proxy sends them to sign-in before it renders.
  useRedirectWhenSignedOut();

  // Signed in, but not an admin.
  useEffect(() => {
    if (status === "authenticated" && !session?.user?.isAdmin) {
      router.push("/");
    }
  }, [status, session, router]);

  const loadOrders = useCallback(async () => {
    if (!session?.accessToken) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getAllOrders(session.accessToken, {
        status: statusFilter || undefined,
        search: appliedSearch || undefined,
        skip,
        limit,
      });

      setOrders(data.orders);
      setTotal(data.total);
    } catch (err: unknown) {
      setError(extractErrorMessage(err, "Failed to load orders"));
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken, statusFilter, appliedSearch, skip]);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.isAdmin) {
      loadOrders();
    }
  }, [status, session?.user?.isAdmin, loadOrders]);

  const openOrder = (order: AdminOrder) => {
    setSelectedOrder(order);
    setNextStatus("");
    setStatusNote("");
    setDeliveryFeeInput(String(order.deliveryFee ?? 0));
    setTrackingInput(order.trackingNumber || "");
    setActionError(null);
    setActionMessage(null);
    setConfirmCancel(false);
    setShowDetailsModal(true);
  };

  /**
   * Run an admin action, then reflect the updated order in both the modal and
   * the table row so the list never shows a stale status or total.
   */
  const runAction = async (
    key: string,
    action: (token: string, orderId: string) => Promise<AdminOrder>,
    successMessage: string
  ) => {
    if (!session?.accessToken || !selectedOrder) return;

    setSaving(key);
    setActionError(null);
    setActionMessage(null);

    try {
      const updated = await action(session.accessToken, selectedOrder.id);

      setSelectedOrder(updated);
      setOrders((current) =>
        current.map((order) => (order.id === updated.id ? updated : order))
      );
      setNextStatus("");
      setStatusNote("");
      setDeliveryFeeInput(String(updated.deliveryFee ?? 0));
      setTrackingInput(updated.trackingNumber || "");
      setConfirmCancel(false);
      setActionMessage(successMessage);
    } catch (err: unknown) {
      setActionError(extractErrorMessage(err, "Action failed"));
    } finally {
      setSaving(null);
    }
  };

  const handleStatusChange = () => {
    if (!nextStatus) return;

    // Cancelling returns stock to inventory, so make the admin confirm first.
    if (nextStatus === "cancelled" && !confirmCancel) {
      setConfirmCancel(true);
      return;
    }

    runAction(
      "status",
      (token, orderId) => updateOrderStatus(token, orderId, nextStatus, statusNote || undefined),
      nextStatus === "cancelled"
        ? "Order cancelled and items returned to stock"
        : `Status updated to ${statusLabel(nextStatus)}`
    );
  };

  const handleDeliveryFee = () => {
    const fee = Number(deliveryFeeInput);

    if (!Number.isFinite(fee) || fee < 0) {
      setActionError("Enter a delivery fee of 0 or more");
      return;
    }

    runAction(
      "delivery",
      (token, orderId) => setOrderDeliveryFee(token, orderId, fee),
      "Delivery fee saved and total updated"
    );
  };

  const handleTracking = () => {
    runAction(
      "tracking",
      (token, orderId) => updateOrderDetails(token, orderId, { trackingNumber: trackingInput }),
      trackingInput ? "Tracking number saved" : "Tracking number cleared"
    );
  };

  const handlePaymentToggle = () => {
    if (!selectedOrder) return;
    const nextValue = !selectedOrder.paymentConfirmed;

    runAction(
      "payment",
      (token, orderId) => updateOrderDetails(token, orderId, { paymentConfirmed: nextValue }),
      nextValue ? "Payment marked as received" : "Payment marked as unpaid"
    );
  };

  const getStatusBadge = (statusValue: string) => {
    const statusOption = STATUS_OPTIONS.find((s) => s.value === statusValue);
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${statusOption?.color || "bg-gray-100"}`}
      >
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
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const nextOptions = selectedOrder ? allowedNextStatuses(selectedOrder.status) : [];
  const isFinal = selectedOrder ? nextOptions.length === 0 : false;

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

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Search</label>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setSkip(0);
                  setAppliedSearch(searchTerm.trim());
                }}
                className="flex gap-2"
              >
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Order number, name or email"
                  className="flex-1 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-secondary"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
                >
                  Search
                </button>
              </form>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setStatusFilter("");
                  setSearchTerm("");
                  setAppliedSearch("");
                  setSkip(0);
                }}
                className="w-full px-4 py-2 border rounded hover:bg-accent transition-colors"
              >
                Clear filters
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
                      <th className="px-4 py-3 text-left text-sm font-medium">Delivery</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Total</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className="border-t hover:bg-accent/5">
                        <td className="px-4 py-3">
                          <button
                            onClick={() => openOrder(order)}
                            className="text-secondary hover:underline font-medium"
                          >
                            {order.orderNumber}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <div className="font-medium">{order.guestName || "Account holder"}</div>
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
                        <td className="px-4 py-3">{getStatusBadge(order.status)}</td>
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
                        <td className="px-4 py-3 text-sm">
                          {Number(order.deliveryFee) > 0 ? (
                            `KES ${Number(order.deliveryFee).toLocaleString()}`
                          ) : (
                            <span className="text-muted-foreground">Not set</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          KES {Number(order.totalAmount || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => openOrder(order)}
                            className="px-3 py-1 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90 text-sm"
                          >
                            Manage
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

        {/* Order Details & Management Modal */}
        {showDetailsModal && selectedOrder && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">Order {selectedOrder.orderNumber}</h2>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>

                {actionError && (
                  <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded border border-destructive text-sm">
                    {actionError}
                  </div>
                )}

                {actionMessage && (
                  <div className="mb-4 p-3 bg-green-50 text-green-800 rounded border border-green-200 text-sm">
                    {actionMessage}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Placed</div>
                      <div className="font-medium">{formatDateTime(selectedOrder.createdAt)}</div>
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

                  {selectedOrder.orderItems && selectedOrder.orderItems.length > 0 && (
                    <div className="border-t pt-4">
                      <h3 className="font-semibold mb-2">Items</h3>
                      <div className="space-y-2">
                        {selectedOrder.orderItems.map((item) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span>
                              {item.productTitle} × {item.quantity}
                            </span>
                            <span>KES {Number(item.totalPrice).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2">Pricing</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>KES {Number(selectedOrder.subtotal || 0).toLocaleString()}</span>
                      </div>
                      {Number(selectedOrder.discountAmount) > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Discount:</span>
                          <span>
                            -KES {Number(selectedOrder.discountAmount).toLocaleString()}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Delivery Fee:</span>
                        <span>KES {Number(selectedOrder.deliveryFee || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total:</span>
                        <span>KES {Number(selectedOrder.totalAmount || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Delivery fee — the figure agreed with the customer */}
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2">Set Delivery Fee</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Delivery cost is agreed with the customer directly. Saving it here updates
                      the order total; the customer is not emailed automatically.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={deliveryFeeInput}
                        onChange={(e) => setDeliveryFeeInput(e.target.value)}
                        disabled={selectedOrder.status === "cancelled"}
                        className="flex-1 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-secondary disabled:opacity-50"
                      />
                      <button
                        onClick={handleDeliveryFee}
                        disabled={saving !== null || selectedOrder.status === "cancelled"}
                        className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90 disabled:opacity-50"
                      >
                        {saving === "delivery" ? "Saving..." : "Save fee"}
                      </button>
                    </div>
                  </div>

                  {/* Status transitions */}
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2">Update Status</h3>
                    {isFinal ? (
                      <p className="text-sm text-muted-foreground">
                        This order is {statusLabel(selectedOrder.status).toLowerCase()} and can no
                        longer be changed.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <select
                          value={nextStatus}
                          onChange={(e) => {
                            setNextStatus(e.target.value);
                            setConfirmCancel(false);
                          }}
                          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-secondary"
                        >
                          <option value="">Choose new status...</option>
                          {nextOptions.map((option) => (
                            <option key={option} value={option}>
                              {statusLabel(option)}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={statusNote}
                          onChange={(e) => setStatusNote(e.target.value)}
                          placeholder="Note (optional)"
                          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-secondary"
                        />
                        {confirmCancel && (
                          <div className="p-3 bg-destructive/10 text-destructive rounded border border-destructive text-sm">
                            Cancelling returns every item on this order to stock. This cannot be
                            undone — press the button again to confirm.
                          </div>
                        )}
                        <button
                          onClick={handleStatusChange}
                          disabled={!nextStatus || saving !== null}
                          className={`w-full px-4 py-2 rounded disabled:opacity-50 ${
                            nextStatus === "cancelled"
                              ? "bg-destructive text-white hover:bg-destructive/90"
                              : "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                          }`}
                        >
                          {saving === "status"
                            ? "Updating..."
                            : confirmCancel
                              ? "Confirm cancellation & restock"
                              : "Update status"}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2">Payment</h3>
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-sm">
                        <div>
                          Method: {selectedOrder.paymentMethod || "N/A"}
                        </div>
                        <div
                          className={
                            selectedOrder.paymentConfirmed ? "text-green-600" : "text-yellow-600"
                          }
                        >
                          {selectedOrder.paymentConfirmed ? "Confirmed ✓" : "Pending"}
                          {selectedOrder.paymentConfirmedAt &&
                            ` — ${formatDateTime(selectedOrder.paymentConfirmedAt)}`}
                        </div>
                      </div>
                      <button
                        onClick={handlePaymentToggle}
                        disabled={saving !== null}
                        className="px-4 py-2 border rounded hover:bg-accent transition-colors disabled:opacity-50 whitespace-nowrap"
                      >
                        {saving === "payment"
                          ? "Saving..."
                          : selectedOrder.paymentConfirmed
                            ? "Mark unpaid"
                            : "Mark received"}
                      </button>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2">Tracking Number</h3>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={trackingInput}
                        onChange={(e) => setTrackingInput(e.target.value)}
                        placeholder="Courier reference"
                        className="flex-1 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-secondary"
                      />
                      <button
                        onClick={handleTracking}
                        disabled={saving !== null}
                        className="px-4 py-2 border rounded hover:bg-accent transition-colors disabled:opacity-50"
                      >
                        {saving === "tracking" ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>

                  {selectedOrder.adminNotes && (
                    <div className="border-t pt-4">
                      <h3 className="font-semibold mb-2">Admin Notes</h3>
                      <pre className="text-sm whitespace-pre-wrap font-sans text-muted-foreground">
                        {selectedOrder.adminNotes.trim()}
                      </pre>
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
