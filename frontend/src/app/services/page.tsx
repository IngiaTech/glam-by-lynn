/**
 * Services page — server component.
 *
 * Fetches the service packages during server rendering so the listing is in the
 * initial HTML. Previously this was a client component that fetched in
 * `useEffect`, which meant crawlers and social unfurlers received a spinner and
 * nothing else (readiness finding H11).
 */

import { getServicePackagesForServer } from "@/lib/server/catalog";

import ServicesCatalog from "./ServicesCatalog";

// Next requires this to be a statically analysable literal, so it can't
// reference CATALOG_REVALIDATE_SECONDS directly — keep the two in step.
export const revalidate = 300;

export default async function ServicesPage() {
  const packages = await getServicePackagesForServer();

  // The fetcher returns [] both for "no packages" and for an API failure. Only
  // the latter deserves an error message, and we can't tell them apart here —
  // an empty catalogue is the safer reading, and ServicesCatalog already has a
  // friendly empty state for it.
  return <ServicesCatalog packages={packages} />;
}
