/**
 * Products page — server component.
 *
 * Fetches the first page of the catalogue and the category list during server
 * rendering, so `/products` ships real content in its initial HTML. It used to
 * be a client component whose data arrived via `useEffect`, and whose
 * `useSearchParams` call forced a Suspense boundary — so the prerendered HTML
 * was a loading spinner and nothing else (readiness finding H11).
 *
 * Reading `?category=` here rather than in the client also means the deep link
 * from the homepage category tiles is applied in the very first render, instead
 * of re-filtering after hydration.
 */

import { getCategoriesForServer, getProductsForServer } from "@/lib/server/catalog";

import ProductsCatalog from "./ProductsCatalog";

// Next requires this to be a statically analysable literal, so it can't
// reference CATALOG_REVALIDATE_SECONDS directly — keep the two in step.
export const revalidate = 300;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const [{ category }, categories] = await Promise.all([
    searchParams,
    getCategoriesForServer(),
  ]);

  // Resolve the deep-linked slug before fetching, so the server renders the
  // same filtered set the client seeds its filter state with. Fetching
  // unfiltered here would show the wrong products until something triggered a
  // refetch — and the initial refetch is deliberately skipped.
  const categoryId = category
    ? categories.find((entry) => entry.slug === category)?.id
    : undefined;

  const { products, total, totalPages } = await getProductsForServer(20, categoryId);

  return (
    <ProductsCatalog
      initialProducts={products}
      initialTotal={total}
      initialTotalPages={totalPages}
      initialCategories={categories}
      initialCategorySlug={category}
    />
  );
}
