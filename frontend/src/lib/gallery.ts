/**
 * Gallery API utilities
 */
import axios from "axios";
import { API_BASE_URL, API_ENDPOINTS } from "@/config/api";
import { GalleryPost, PaginatedResponse } from "@/types";

export interface GalleryFilters {
  page?: number;
  pageSize?: number;
  mediaType?: "image" | "video";
  sourceType?: "instagram" | "tiktok" | "original";
}

/**
 * Fetch gallery posts with pagination and filters
 */
export async function fetchGalleryPosts(
  filters?: GalleryFilters
): Promise<PaginatedResponse<GalleryPost>> {
  const params: Record<string, string | number> = {};

  if (filters?.page) params.page = filters.page;
  if (filters?.pageSize) params.page_size = filters.pageSize;
  if (filters?.mediaType) params.media_type = filters.mediaType;
  if (filters?.sourceType) params.source_type = filters.sourceType;

  const response = await axios.get<PaginatedResponse<GalleryPost>>(
    `${API_BASE_URL}${API_ENDPOINTS.GALLERY.LIST}`,
    { params }
  );

  return response.data;
}
