/**
 * Admin orders API client
 *
 * Distinct from lib/orders.ts, which is the customer-facing client. The
 * endpoints here are admin-only and cover the whole shop's orders — the
 * customer client's list endpoint only ever returns the caller's own.
 */

import { API_BASE_URL, API_ENDPOINTS } from "@/config/api";
import { AdminOrder } from "@/types";

export interface AdminOrderListParams {
  status?: string;
  paymentConfirmed?: boolean;
  search?: string;
  skip?: number;
  limit?: number;
}

export interface AdminOrderListResult {
  orders: AdminOrder[];
  total: number;
  skip: number;
  limit: number;
}

async function request<T>(url: string, token: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Request failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * List every order in the shop, newest first, with optional filters.
 */
export async function getAllOrders(
  token: string,
  params: AdminOrderListParams = {}
): Promise<AdminOrderListResult> {
  const { status, paymentConfirmed, search, skip = 0, limit = 20 } = params;

  const query = new URLSearchParams({
    skip: skip.toString(),
    limit: limit.toString(),
  });

  if (status) query.set("status", status);
  if (paymentConfirmed !== undefined) query.set("paymentConfirmed", String(paymentConfirmed));
  if (search) query.set("search", search);

  return request<AdminOrderListResult>(
    `${API_BASE_URL}${API_ENDPOINTS.ADMIN_ORDERS.LIST}?${query}`,
    token
  );
}

/**
 * Get one order with its items, tracking number and admin notes.
 */
export async function getAdminOrder(token: string, orderId: string): Promise<AdminOrder> {
  return request<AdminOrder>(
    `${API_BASE_URL}${API_ENDPOINTS.ADMIN_ORDERS.DETAIL(orderId)}`,
    token
  );
}

/**
 * Move an order to a new status.
 *
 * Cancelling restocks the order's items on the backend, so this is not a
 * cosmetic field change — see the transition rules in the API docs.
 */
export async function updateOrderStatus(
  token: string,
  orderId: string,
  status: string,
  adminNotes?: string
): Promise<AdminOrder> {
  return request<AdminOrder>(
    `${API_BASE_URL}${API_ENDPOINTS.ADMIN_ORDERS.STATUS(orderId)}`,
    token,
    { method: "PUT", body: JSON.stringify({ status, adminNotes }) }
  );
}

/**
 * Record the delivery fee agreed with the customer; the backend recomputes
 * the order total from it.
 */
export async function setOrderDeliveryFee(
  token: string,
  orderId: string,
  deliveryFee: number,
  adminNotes?: string
): Promise<AdminOrder> {
  return request<AdminOrder>(
    `${API_BASE_URL}${API_ENDPOINTS.ADMIN_ORDERS.DELIVERY(orderId)}`,
    token,
    { method: "PUT", body: JSON.stringify({ deliveryFee, adminNotes }) }
  );
}

/**
 * Update fulfilment details that carry no stock or money consequences.
 */
export async function updateOrderDetails(
  token: string,
  orderId: string,
  updates: { trackingNumber?: string; paymentConfirmed?: boolean; adminNotes?: string }
): Promise<AdminOrder> {
  return request<AdminOrder>(
    `${API_BASE_URL}${API_ENDPOINTS.ADMIN_ORDERS.UPDATE(orderId)}`,
    token,
    { method: "PUT", body: JSON.stringify(updates) }
  );
}

/**
 * Statuses an order can move to from where it is now.
 *
 * Mirrors ORDER_STATUS_TRANSITIONS in the backend's order_service so the UI
 * only offers moves the API will accept. The backend remains authoritative.
 */
export const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ["payment_confirmed", "processing", "cancelled"],
  payment_confirmed: ["processing", "shipped", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export function allowedNextStatuses(status: string): string[] {
  return ORDER_STATUS_TRANSITIONS[status] ?? [];
}
