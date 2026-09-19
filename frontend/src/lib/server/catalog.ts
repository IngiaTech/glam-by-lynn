/**
 * Server-side catalog fetchers.
 *
 * These run during server rendering so listing pages ship real content in their
 * initial HTML — crawlers and social unfurlers don't execute the `useEffect`
 * fetches the client components use.
 *
 * Two deliberate differences from the client API clients in `lib/*.ts`:
 *
 * 1. **They cache.** The client helpers use `cache: "no-store"`, which would
 *    make every crawl hit the API. These revalidate on an interval instead, so
 *    a burst of traffic costs one upstream request.
 * 2. **They never throw.** A listing page must still render its chrome, copy
 *    and links if the API is slow or cold-starting — returning empty is a
 *    degraded page, but throwing is a 500 that a crawler records as a dead URL.
 */

import { API_BASE_URL, API_ENDPOINTS } from "@/config/api";
import type { Category, Product, ServicePackage } from "@/types";

/** How long server-rendered catalog data stays fresh, in seconds. */
export const CATALOG_REVALIDATE_SECONDS = 300;

interface Paginated<T> {
  items: T[];
  total: number;
  total_pages: number;
}

async function fetchJson<T>(
  path: string,
  label: string,
  revalidateSeconds: number = CATALOG_REVALIDATE_SECONDS
): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      next: { revalidate: revalidateSeconds },
    });

    if (!response.ok) {
      console.error(`[catalog] ${label} responded ${response.status}`);
      return null;
    }

    return (await response.json()) as T;
  } catch (error) {
    console.error(`[catalog] ${label} failed`, error);
    return null;
  }
}

export interface ServerProductList {
  products: Product[];
  total: number;
  totalPages: number;
}

/**
 * First page of the product catalog, in the same shape the client component
 * holds in state so it can be handed straight over as initial data.
 *
 * `categoryId` must mirror whatever filter the client seeds its state with,
 * otherwise the server renders one set of products and the client believes a
 * different filter is active.
 *
 * Param names are camelCase to match `lib/products.ts` and the API — except
 * `page_size`, which really is snake_case on the backend.
 */
export async function getProductsForServer(
  pageSize = 20,
  categoryId?: string
): Promise<ServerProductList> {
  const params = new URLSearchParams({
    page: "1",
    page_size: String(pageSize),
    sortBy: "created_at",
    sortOrder: "desc",
  });

  if (categoryId) params.append("categoryId", categoryId);

  const data = await fetchJson<Paginated<Product>>(
    `${API_ENDPOINTS.PRODUCTS.LIST}?${params}`,
    "products"
  );

  if (!data) {
    return { products: [], total: 0, totalPages: 1 };
  }

  return {
    products: data.items ?? [],
    total: data.total ?? 0,
    totalPages: data.total_pages ?? 1,
  };
}

/** The products endpoint rejects `page_size` above this (422). */
const MAX_API_PAGE_SIZE = 100;

/**
 * Sitemap data is cached for a day. Next uses the *minimum* of a route's
 * `revalidate` and its fetches', so leaving these on the 5-minute catalogue
 * interval would quietly rebuild the sitemap every 5 minutes.
 */
export const SITEMAP_REVALIDATE_SECONDS = 86400;

/**
 * Every product, for the sitemap.
 *
 * Pages through the API in chunks the endpoint accepts — asking for more than
 * `MAX_API_PAGE_SIZE` in one request is a 422, which would silently produce an
 * empty list and a sitemap with no product URLs at all.
 */
export async function getAllProductsForSitemap(limit: number): Promise<Product[]> {
  const collected: Product[] = [];
  let page = 1;

  while (collected.length < limit) {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(Math.min(MAX_API_PAGE_SIZE, limit - collected.length)),
      sortBy: "created_at",
      sortOrder: "desc",
    });

    const data = await fetchJson<Paginated<Product>>(
      `${API_ENDPOINTS.PRODUCTS.LIST}?${params}`,
      `products page ${page}`,
      SITEMAP_REVALIDATE_SECONDS
    );

    const items = data?.items ?? [];
    collected.push(...items);

    const totalPages = data?.total_pages ?? 1;
    if (items.length === 0 || page >= totalPages) break;

    page += 1;
  }

  return collected.slice(0, limit);
}

export async function getCategoriesForServer(): Promise<Category[]> {
  const data = await fetchJson<Category[] | Paginated<Category>>(
    `${API_ENDPOINTS.CATEGORIES.LIST}?limit=100`,
    "categories"
  );

  if (!data) return [];
  return Array.isArray(data) ? data : (data.items ?? []);
}

export async function getServicePackagesForServer(): Promise<ServicePackage[]> {
  const data = await fetchJson<Paginated<ServicePackage>>(
    API_ENDPOINTS.SERVICES.LIST,
    "services"
  );

  if (!data) return [];
  return data.items ?? [];
}
