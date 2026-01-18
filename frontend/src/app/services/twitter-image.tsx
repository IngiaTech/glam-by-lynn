/**
 * Services Twitter Card Image
 * Generates dynamic Twitter card image for services page
 */

import { ImageResponse } from '@vercel/og';
import { GenericPageOGTemplate } from '@/lib/og-templates';

export const runtime = 'edge';
export const alt = 'Makeup & Beauty Services - Glam by Lynn';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    <GenericPageOGTemplate
      title="Professional Makeup Services"
      description="Bridal makeup, special occasions, and makeup classes in Kitui & Nairobi"
    />,
    { ...size }
  );
}
