/**
 * Product API utilities
 */

import axios from "axios";
import { API_BASE_URL, API_ENDPOINTS } from "@/config/api";
import { Product, PaginatedResponse, Brand, Category } from "@/types";

export interface ProductFilters {
  brandId?: string;
  categoryId?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  inStockOnly?: boolean;
  page?: number;
  pageSize?: number;
}

/**
 * Fetch products with optional filters
 */
export async function getProducts(
  filters: ProductFilters = {}
): Promise<PaginatedResponse<Product>> {
  const params = new URLSearchParams();

  if (filters.page) params.append("page", filters.page.toString());
  if (filters.pageSize) params.append("page_size", filters.pageSize.toString());
  if (filters.brandId) params.append("brandId", filters.brandId);
  if (filters.categoryId) params.append("categoryId", filters.categoryId);
  if (filters.search) params.append("search", filters.search);
  if (filters.minPrice !== undefined) params.append("minPrice", filters.minPrice.toString());
  if (filters.maxPrice !== undefined) params.append("maxPrice", filters.maxPrice.toString());
  if (filters.sortBy) params.append("sortBy", filters.sortBy);
  if (filters.sortOrder) params.append("sortOrder", filters.sortOrder);
  if (filters.inStockOnly !== undefined) params.append("inStockOnly", filters.inStockOnly.toString());

  const response = await axios.get<PaginatedResponse<Product>>(
    `${API_BASE_URL}${API_ENDPOINTS.PRODUCTS.LIST}?${params.toString()}`
  );

  return response.data;
}

/**
 * Fetch a single product by ID
 */
export async function getProductById(productId: string): Promise<Product> {
  const response = await axios.get<Product>(
    `${API_BASE_URL}${API_ENDPOINTS.PRODUCTS.DETAIL(productId)}`
  );

  return response.data;
}

/**
 * Fetch featured products
 */
export async function getFeaturedProducts(
  page: number = 1,
  pageSize: number = 10
): Promise<PaginatedResponse<Product>> {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
  });

  const response = await axios.get<PaginatedResponse<Product>>(
    `${API_BASE_URL}${API_ENDPOINTS.PRODUCTS.FEATURED}?${params.toString()}`
  );

  return response.data;
}

/**
 * Fetch all brands
 */
export async function getBrands(): Promise<Brand[]> {
  const response = await axios.get<Brand[]>(
    `${API_BASE_URL}${API_ENDPOINTS.BRANDS.LIST}`
  );

  return response.data;
}

/**
 * Fetch all categories
 */
export async function getCategories(): Promise<Category[]> {
  const response = await axios.get<Category[]>(
    `${API_BASE_URL}${API_ENDPOINTS.CATEGORIES.LIST}`
  );

  return response.data;
}
