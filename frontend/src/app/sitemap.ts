import { MetadataRoute } from 'next'

import {
  getAllProductsForSitemap,
  getCategoriesForServer,
  getServicePackagesForServer,
} from '@/lib/server/catalog'

// Regenerate daily: products and services change far less often than the
// catalogue pages themselves, and a sitemap crawl shouldn't hammer the API.
export const revalidate = 86400

// Upper bound on detail URLs pulled into the sitemap. Well above the current
// catalogue, and a guard against an unbounded document if it ever grows.
const MAX_DETAIL_URLS = 1000

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://glambylynn.com'

  // Never let a sitemap build fail the whole route: the fetchers already
  // swallow errors and return empty, so a slow or cold API degrades to the
  // static routes rather than a 500 that a crawler records against the site.
  // Services and categories reuse the 5-minute catalogue cache; only the
  // product page-through is pinned to the daily interval. Next takes the
  // minimum of route and fetch revalidate, so the sitemap still refreshes on
  // the catalogue's schedule — which is fine, and cheaper than it sounds since
  // those two responses are already cached for the listing pages.
  const [products, services, categories] = await Promise.all([
    getAllProductsForSitemap(MAX_DETAIL_URLS),
    getServicePackagesForServer(),
    getCategoriesForServer(),
  ])

  const productUrls: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${baseUrl}/products/${product.id}`,
    // The public product payload carries no updated_at, so we can't advertise a
    // real modification date. Crawlers treat a wrong one worse than a generic.
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  const serviceUrls: MetadataRoute.Sitemap = services.map((servicePackage) => ({
    url: `${baseUrl}/services/${servicePackage.id}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.8,
  }))

  // Category landing pages are the `?category=` deep links the homepage tiles
  // already use, and they now server-render their filtered listing.
  const categoryUrls: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${baseUrl}/products?category=${encodeURIComponent(category.slug)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/services`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/gallery`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/vision`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
  ]

  return [...staticRoutes, ...categoryUrls, ...serviceUrls, ...productUrls]
}
