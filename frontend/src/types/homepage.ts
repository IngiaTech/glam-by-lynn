/**
 * Shapes the homepage renders.
 *
 * These mirror what the homepage's endpoints actually return, which is not the
 * same as the shared types in `@/types` — the featured-product payload carries
 * `average_rating`/`review_count`, and the testimonial payload differs from the
 * admin-facing `Testimonial`. They live here rather than inside the page so the
 * server fetcher in `lib/server/catalog.ts` and the client component agree on
 * one definition.
 */

export interface Product {
  id: string;
  title: string;
  slug: string;
  description?: string;
  base_price: number;
  final_price?: number;
  discount_type?: "percentage" | "fixed";
  discount_value?: number;
  inventory_count: number;
  is_featured: boolean;
  images?: Array<{ image_url: string; alt_text?: string; is_primary?: boolean; display_order?: number }>;
  brand?: { name: string };
  category?: { id: string; name: string };
  average_rating?: number;
  review_count?: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  product_count?: number;
}

/**
 * As returned by `/api/testimonials/featured`, which serialises camelCase.
 *
 * The homepage previously declared `author_name`/`content` here and assigned
 * the whole `{ items: [...] }` envelope to its testimonial state, so
 * `testimonials.length` was undefined and the section rendered its
 * "coming soon" placeholder unconditionally. It had never displayed a real
 * testimonial.
 */
export interface Testimonial {
  id: string;
  customerName: string;
  testimonialText: string;
  rating: number;
  location?: string | null;
  isFeatured?: boolean;
}

export interface ServicePackage {
  id: string;
  package_type: string;
  name: string;
  description: string;
  base_bride_price: string;
  base_maid_price?: string;
  base_mother_price?: string;
  base_other_price?: string;
  max_maids?: number;
  min_maids?: number;
  includes_facial: boolean;
  duration_minutes: number;
  image_url?: string;
  is_featured?: boolean;
  display_order: number;
}
