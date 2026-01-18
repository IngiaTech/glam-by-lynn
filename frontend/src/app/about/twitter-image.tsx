/**
 * About Twitter Card Image
 * Generates dynamic Twitter card image for about page
 */

import { ImageResponse } from '@vercel/og';
import { GenericPageOGTemplate } from '@/lib/og-templates';

export const runtime = 'edge';
export const alt = 'About Us - Glam by Lynn';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    <GenericPageOGTemplate
      title="About Glam by Lynn"
      description="Your trusted beauty partner in Kitui and Nairobi, Kenya"
    />,
    { ...size }
  );
}
