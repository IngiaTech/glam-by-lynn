/**
 * Bookings API client
 * Functions to interact with the bookings backend API
 */

import { API_BASE_URL, API_ENDPOINTS } from "@/config/api";
import { TransportLocation, Booking } from "@/types";

/**
 * Fetch all active transport locations
 */
export async function getTransportLocations(): Promise<TransportLocation[]> {
  const response = await fetch(`${API_BASE_URL}/api/services/locations`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch transport locations: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}

/**
 * Check availability for a date range
 */
export async function checkAvailability(
  startDate: string,
  endDate?: string,
  days: number = 7
): Promise<any> {
  const params = new URLSearchParams({
    start_date: startDate,
    days: days.toString(),
  });

  if (endDate) {
    params.set("end_date", endDate);
  }

  const response = await fetch(
    `${API_BASE_URL}${API_ENDPOINTS.BOOKINGS.AVAILABILITY}?${params}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch availability: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Create a new booking
 */
export async function createBooking(
  bookingData: {
    package_id: string;
    booking_date: string;
    booking_time: string;
    location_id?: string;
    custom_location_address?: string;
    custom_location_latitude?: number;
    custom_location_longitude?: number;
    custom_location_distance_km?: number;
    num_brides: number;
    num_maids: number;
    num_mothers: number;
    num_others: number;
    wedding_theme?: string;
    special_requests?: string;
    guest_email?: string;
    guest_name?: string;
    guest_phone?: string;
  },
  token?: string
): Promise<Booking> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.BOOKINGS.CREATE}`, {
    method: "POST",
    headers,
    body: JSON.stringify(bookingData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to create booking: ${response.statusText}`);
  }

  const data = await response.json();
  return transformBookingResponse(data);
}

/**
 * Calculate booking price
 */
export function calculateBookingPrice(
  baseBridePrice: number = 0,
  baseMaidPrice: number = 0,
  baseMotherPrice: number = 0,
  baseOtherPrice: number = 0,
  numBrides: number = 0,
  numMaids: number = 0,
  numMothers: number = 0,
  numOthers: number = 0,
  transportCost: number = 0
): { subtotal: number; transport: number; total: number; deposit: number } {
  const subtotal =
    baseBridePrice * numBrides +
    baseMaidPrice * numMaids +
    baseMotherPrice * numMothers +
    baseOtherPrice * numOthers;

  const total = subtotal + transportCost;
  const deposit = Math.round(total * 0.5);

  return {
    subtotal,
    transport: transportCost,
    total,
    deposit,
  };
}

/**
 * Transform backend booking response (snake_case) to frontend format (camelCase)
 */
function transformBookingResponse(data: any): Booking {
  return {
    id: data.id,
    bookingNumber: data.booking_number,
    userId: data.user_id,
    guestEmail: data.guest_email,
    guestName: data.guest_name,
    guestPhone: data.guest_phone,
    packageId: data.package_id,
    bookingDate: data.booking_date,
    bookingTime: data.booking_time,
    locationId: data.location_id,
    customLocationAddress: data.custom_location_address,
    customLocationLatitude: data.custom_location_latitude,
    customLocationLongitude: data.custom_location_longitude,
    customLocationDistanceKm: data.custom_location_distance_km,
    numBrides: data.num_brides,
    numMaids: data.num_maids,
    numMothers: data.num_mothers,
    numOthers: data.num_others,
    weddingTheme: data.wedding_theme,
    specialRequests: data.special_requests,
    subtotal: parseFloat(data.subtotal),
    transportCost: parseFloat(data.transport_cost),
    totalAmount: parseFloat(data.total_amount),
    depositAmount: data.deposit_amount ? parseFloat(data.deposit_amount) : undefined,
    depositPaid: data.deposit_paid,
    depositPaidAt: data.deposit_paid_at,
    status: data.status,
    adminNotes: data.admin_notes,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    package: data.package,
    location: data.location,
  };
}

/**
 * Get a specific booking by ID
 */
export async function getBookingById(bookingId: string, token?: string): Promise<Booking> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.BOOKINGS.DETAIL(bookingId)}`, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to fetch booking: ${response.statusText}`);
  }

  const data = await response.json();
  return transformBookingResponse(data);
}

/**
 * Format currency for display (KSh)
 */
export function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null) return "KSh 0";
  return `KSh ${amount.toLocaleString()}`;
}

/**
 * Format date for display
 */
export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Format time for display
 */
export function formatTime(timeStr: string | undefined | null): string {
  if (!timeStr) return "N/A";
  const [hours, minutes] = timeStr.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

/**
 * Get user's booking list with pagination
 */
export async function getUserBookings(
  token: string,
  page: number = 1,
  pageSize: number = 20,
  status?: string
): Promise<{ items: Booking[]; total: number; page: number; totalPages: number }> {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
  });

  if (status) {
    params.set("status", status);
  }

  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.BOOKINGS.LIST}?${params}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to fetch bookings: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    items: data.items.map(transformBookingResponse),
    total: data.total,
    page: data.page,
    totalPages: data.total_pages,
  };
}

/**
 * Cancel a booking
 */
export async function cancelBooking(bookingId: string, token: string): Promise<Booking> {
  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.BOOKINGS.CANCEL(bookingId)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to cancel booking: ${response.statusText}`);
  }

  const data = await response.json();
  return transformBookingResponse(data);
}

/**
 * Get status badge variant based on booking status
 */
export function getStatusBadgeVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "confirmed":
    case "deposit_paid":
      return "default";
    case "pending":
      return "secondary";
    case "cancelled":
      return "destructive";
    case "completed":
      return "outline";
    default:
      return "secondary";
  }
}

/**
 * Format status for display
 */
export function formatStatus(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
