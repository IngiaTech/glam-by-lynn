/**
 * Gallery Twitter Card Image
 * Generates dynamic Twitter card image for gallery page
 */

import { ImageResponse } from '@vercel/og';
import { GenericPageOGTemplate } from '@/lib/og-templates';

export const runtime = 'edge';
export const alt = 'Portfolio Gallery - Glam by Lynn';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    <GenericPageOGTemplate
      title="Portfolio & Transformations"
      description="Explore our stunning makeup transformations and beauty work"
    />,
    { ...size }
  );
}
