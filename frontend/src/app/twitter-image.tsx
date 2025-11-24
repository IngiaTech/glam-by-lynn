/**
 * Homepage Twitter Card Image
 * Generates dynamic Twitter card image for the homepage
 */

import { ImageResponse } from '@vercel/og';
import { HomepageOGTemplate } from '@/lib/og-templates';

export const runtime = 'edge';
export const alt = 'Glam by Lynn - Premier Makeup Artistry & Beauty Services';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(<HomepageOGTemplate />, {
    ...size,
  });
}
