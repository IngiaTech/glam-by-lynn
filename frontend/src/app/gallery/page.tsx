/**
 * Gallery page — server component.
 *
 * Fetches the first, unfiltered page of posts during server rendering so the
 * gallery's images are in the initial HTML. The page used to render its chrome
 * immediately but load every post from a `useEffect`, so a crawler saw an empty
 * grid (readiness finding H11).
 */

import { getGalleryPostsForServer } from "@/lib/server/catalog";

import GalleryBrowser from "./GalleryBrowser";

// Next requires this to be a statically analysable literal, so it can't
// reference CATALOG_REVALIDATE_SECONDS directly — keep the two in step.
export const revalidate = 300;

export default async function GalleryPage() {
  const { posts, totalPages } = await getGalleryPostsForServer();

  return <GalleryBrowser initialPosts={posts} initialTotalPages={totalPages} />;
}
