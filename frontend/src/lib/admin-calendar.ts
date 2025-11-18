/**
 * Calendar availability API functions for admin
 */
import axios from "axios";
import { API_BASE_URL, API_ENDPOINTS } from "@/config/api";
import type {
  CalendarAvailability,
  CalendarAvailabilityCreate,
} from "@/types";

interface CalendarListResponse {
  items: CalendarAvailability[];
  total: number;
}

/**
 * Fetch calendar availability for a date range
 */
export async function fetchCalendarAvailability(
  startDate: string,
  endDate: string,
  availableOnly: boolean = false,
  token?: string
): Promise<CalendarListResponse> {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const response = await axios.get<CalendarListResponse>(
    `${API_BASE_URL}${API_ENDPOINTS.ADMIN_CALENDAR.LIST}`,
    {
      params: {
        startDate,
        endDate,
        availableOnly,
      },
      headers,
    }
  );

  return response.data;
}

/**
 * Block a time slot
 */
export async function blockTimeSlot(
  data: CalendarAvailabilityCreate,
  token: string
): Promise<CalendarAvailability> {
  const response = await axios.post<CalendarAvailability>(
    `${API_BASE_URL}${API_ENDPOINTS.ADMIN_CALENDAR.BLOCK}`,
    data,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
}

/**
 * Unblock a time slot
 */
export async function unblockTimeSlot(
  slotId: string,
  token: string
): Promise<void> {
  await axios.delete(
    `${API_BASE_URL}${API_ENDPOINTS.ADMIN_CALENDAR.UNBLOCK(slotId)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

/**
 * Get a specific calendar slot by ID
 */
export async function getCalendarSlot(
  slotId: string,
  token: string
): Promise<CalendarAvailability> {
  const response = await axios.get<CalendarAvailability>(
    `${API_BASE_URL}${API_ENDPOINTS.ADMIN_CALENDAR.DETAIL(slotId)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
}
