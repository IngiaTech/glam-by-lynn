/**
 * Product Detail OpenGraph Image
 *
 * Renders a 1200×630 social preview with the product's primary image,
 * name, price (with compare-at strike-through when discounted), category,
 * brand, stock state, and a sentence-trimmed description.
 */

import { ImageResponse } from "@vercel/og";

import { API_BASE_URL, API_ENDPOINTS } from "@/config/api";
import {
  OG_SIZE,
  ProductOGTemplate,
  GenericPageOGTemplate,
  trimDescription,
} from "@/lib/og-templates";
import { Product } from "@/types";

export const runtime = "edge";
export const alt = "Product - Glam by Lynn";
export const size = OG_SIZE;
export const contentType = "image/png";

const PRICE_FALLBACK = "Contact for pricing";

async function getProduct(id: string): Promise<Product | null> {
  try {
    const response = await fetch(
      `${API_BASE_URL}${API_ENDPOINTS.PRODUCTS.DETAIL(id)}`,
      { cache: "no-store" },
    );
    if (!response.ok) return null;
    return (await response.json()) as Product;
  } catch (error) {
    console.error("OG product fetch failed", error);
    return null;
  }
}

function formatKsh(raw: string | number | undefined | null): string | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = typeof raw === "string" ? Number.parseFloat(raw) : raw;
  if (!Number.isFinite(n)) return null;
  return `KSh ${Math.round(n).toLocaleString("en-KE")}`;
}

function resolvePrimaryImage(product: Product): string | undefined {
  if (!product.images || product.images.length === 0) return undefined;
  const primary =
    product.images.find((img) => img.is_primary) ?? product.images[0];
  if (!primary?.image_url) return undefined;
  if (
    primary.image_url.startsWith("http://") ||
    primary.image_url.startsWith("https://")
  ) {
    return primary.image_url;
  }
  return `${API_BASE_URL}${primary.image_url}`;
}

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    return new ImageResponse(
      (
        <GenericPageOGTemplate
          title="Product not available"
          description="This product may have been removed. Browse the full Glam by Lynn collection at glambylynn.com."
        />
      ),
      { ...size },
    );
  }

  const price = formatKsh(product.final_price ?? product.base_price) ?? PRICE_FALLBACK;
  const hasDiscount =
    product.final_price &&
    product.base_price &&
    Number.parseFloat(String(product.final_price)) <
      Number.parseFloat(String(product.base_price));
  const comparePrice = hasDiscount ? formatKsh(product.base_price) ?? undefined : undefined;

  return new ImageResponse(
    (
      <ProductOGTemplate
        name={product.title}
        description={trimDescription(product.description, 160)}
        price={price}
        comparePrice={comparePrice}
        category={product.category?.name}
        brand={product.brand?.name}
        inStock={(product.in_stock ?? product.inventory_count > 0) === true}
        imageUrl={resolvePrimaryImage(product)}
      />
    ),
    { ...size },
  );
}
