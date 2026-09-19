/**
 * Homepage — server component.
 *
 * Fetches the featured services, products, categories and testimonials during
 * server rendering so they appear in the initial HTML. The page used to render
 * its marketing copy immediately but load every listing from a `useEffect`, so
 * a crawler or social unfurler saw the chrome and none of the catalogue
 * (readiness finding H11).
 *
 * The four requests also ran in sequence there; here they run in parallel.
 */

import { getHomepageData } from "@/lib/server/catalog";

import HomePage from "./HomePage";

// Next requires this to be a statically analysable literal, so it can't
// reference CATALOG_REVALIDATE_SECONDS directly — keep the two in step.
export const revalidate = 300;

export default async function Page() {
  const { featuredServices, featuredProducts, categories, testimonials } =
    await getHomepageData();

  return (
    <HomePage
      featuredServices={featuredServices}
      featuredProducts={featuredProducts}
      categories={categories}
      testimonials={testimonials}
    />
  );
}
