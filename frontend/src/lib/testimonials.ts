/**
 * Testimonials API utilities
 */
import axios from "axios";
import { API_BASE_URL, API_ENDPOINTS } from "@/config/api";
import { Testimonial } from "@/types";

export interface TestimonialFilters {
  relatedServiceId?: string;
  relatedProductId?: string;
}

export interface TestimonialListResponse {
  items: Testimonial[];
  total: number;
}

/**
 * Fetch all approved testimonials with optional filters
 */
export async function fetchTestimonials(
  filters?: TestimonialFilters
): Promise<TestimonialListResponse> {
  const params: Record<string, string> = {};

  if (filters?.relatedServiceId) {
    params.related_service_id = filters.relatedServiceId;
  }
  if (filters?.relatedProductId) {
    params.related_product_id = filters.relatedProductId;
  }

  const response = await axios.get<TestimonialListResponse>(
    `${API_BASE_URL}${API_ENDPOINTS.TESTIMONIALS.LIST}`,
    { params }
  );

  return response.data;
}

/**
 * Fetch only featured testimonials
 */
export async function fetchFeaturedTestimonials(): Promise<TestimonialListResponse> {
  const response = await axios.get<TestimonialListResponse>(
    `${API_BASE_URL}${API_ENDPOINTS.TESTIMONIALS.FEATURED}`
  );

  return response.data;
}
