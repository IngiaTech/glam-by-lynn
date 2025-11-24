/**
 * Products Listing Twitter Card Image
 * Generates dynamic Twitter card image for products page
 */

import { ImageResponse } from '@vercel/og';
import { GenericPageOGTemplate } from '@/lib/og-templates';

export const runtime = 'edge';
export const alt = 'Beauty Products - Glam by Lynn';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    <GenericPageOGTemplate
      title="Premium Beauty Products"
      description="Curated selection of quality makeup and beauty products delivered to your door"
    />,
    { ...size }
  );
}
