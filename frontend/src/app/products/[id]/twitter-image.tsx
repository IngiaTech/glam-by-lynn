/**
 * Product Detail Twitter Card Image
 * Generates dynamic Twitter card image for individual product pages
 */

import { ImageResponse } from '@vercel/og';
import { ProductOGTemplate } from '@/lib/og-templates';
import { API_BASE_URL, API_ENDPOINTS } from '@/config/api';
import { Product } from '@/types';

export const runtime = 'edge';
export const alt = 'Product - Glam by Lynn';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

async function getProduct(id: string): Promise<Product | null> {
  try {
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.PRODUCTS.DETAIL(id)}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching product for Twitter image:', error);
    return null;
  }
}

export default async function Image({ params }: { params: { id: string } }) {
  const product = await getProduct(params.id);

  if (!product) {
    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            backgroundColor: '#000000',
            color: '#FFFFFF',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '48px',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          Product Not Found
        </div>
      ),
      { ...size }
    );
  }

  const price = product.basePrice
    ? `KSh ${product.basePrice.toLocaleString()}`
    : 'Contact for pricing';

  const description = product.description?.substring(0, 150) || 'Quality beauty product from Glam by Lynn';

  return new ImageResponse(
    <ProductOGTemplate
      name={product.title}
      description={description}
      price={price}
      category={product.category?.name}
      inStock={product.inventoryCount > 0}
    />,
    { ...size }
  );
}
