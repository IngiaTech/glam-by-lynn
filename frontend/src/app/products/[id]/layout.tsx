/**
 * Product detail server layout — owns the per-product `<meta>` tags so
 * social previews unfurl with real title/description/price next to the
 * auto-generated OpenGraph image. The actual page body is the existing
 * client component in `./page.tsx`.
 */

import type { Metadata } from "next";
import type { ReactNode } from "react";

import { API_BASE_URL, API_ENDPOINTS } from "@/config/api";
import { siteConfig } from "@/lib/metadata";
import { trimDescription } from "@/lib/og-templates";
import type { Product } from "@/types";

async function getProduct(id: string): Promise<Product | null> {
  try {
    const res = await fetch(
      `${API_BASE_URL}${API_ENDPOINTS.PRODUCTS.DETAIL(id)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    return (await res.json()) as Product;
  } catch (error) {
    console.error("metadata product fetch failed", error);
    return null;
  }
}

function formatKsh(raw: string | number | undefined | null): string | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = typeof raw === "string" ? Number.parseFloat(raw) : raw;
  if (!Number.isFinite(n)) return null;
  return `KSh ${Math.round(n).toLocaleString("en-KE")}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    return {
      title: "Product not available",
      description:
        "This product may have been removed. Browse the full Glam by Lynn collection.",
      robots: { index: false, follow: true },
    };
  }

  const price = formatKsh(product.final_price ?? product.base_price);
  const inStock = (product.in_stock ?? product.inventory_count > 0) === true;
  const trimmedDesc = trimDescription(product.description, 160);
  const description = [
    price ? `${price}.` : null,
    trimmedDesc || "Quality beauty product from Glam by Lynn.",
  ]
    .filter(Boolean)
    .join(" ");

  const canonical = `${siteConfig.url}/products/${product.id}`;
  const title = product.brand?.name
    ? `${product.title} — ${product.brand.name}`
    : product.title;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title,
      description,
      url: canonical,
      siteName: siteConfig.name,
      locale: "en_KE",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      creator: "@glambylynn",
    },
    other: {
      // Product-specific OG metadata recognised by Facebook, WhatsApp,
      // and Pinterest rich-pin crawlers.
      ...(price
        ? {
            "og:price:amount": String(
              product.final_price ?? product.base_price,
            ),
            "og:price:currency": "KES",
            "product:price:amount": String(
              product.final_price ?? product.base_price,
            ),
            "product:price:currency": "KES",
          }
        : {}),
      "product:availability": inStock ? "in stock" : "out of stock",
      ...(product.brand?.name ? { "product:brand": product.brand.name } : {}),
      ...(product.category?.name
        ? { "product:category": product.category.name }
        : {}),
    },
  };
}

export default function ProductLayout({ children }: { children: ReactNode }) {
  return children;
}
