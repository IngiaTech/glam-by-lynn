# OpenGraph Dynamic Preview Images

This document explains the dynamic OpenGraph (OG) image generation system for social media sharing previews.

## Overview

When users share links to Glam by Lynn on social media (Facebook, Twitter, LinkedIn, WhatsApp, etc.), beautiful preview images are automatically generated with appropriate metadata. This improves engagement and brand presentation.

## How It Works

### Technology Stack
- **@vercel/og** - Vercel's OpenGraph image generation library
- **Next.js Image API** - Built-in support for opengraph-image.tsx files
- **Edge Runtime** - Fast image generation at the edge

### Dynamic Image Routes

Each page can have its own custom OG image by adding `opengraph-image.tsx` and `twitter-image.tsx` files in the route directory:

```
app/
├── opengraph-image.tsx          # Homepage OG image
├── twitter-image.tsx            # Homepage Twitter card
├── products/
│   ├── opengraph-image.tsx      # Products listing OG image
│   ├── twitter-image.tsx
│   └── [id]/
│       ├── opengraph-image.tsx  # Dynamic product detail OG image
│       └── twitter-image.tsx
├── services/
│   ├── opengraph-image.tsx      # Services listing OG image
│   └── twitter-image.tsx
├── gallery/
│   ├── opengraph-image.tsx      # Gallery OG image
│   └── twitter-image.tsx
└── about/
    ├── opengraph-image.tsx      # About page OG image
    └── twitter-image.tsx
```

## Image Specifications

- **Dimensions**: 1200x630 pixels (recommended by Facebook/Twitter)
- **Format**: PNG
- **Runtime**: Edge (fast generation)
- **Caching**: Automatic by Next.js

## Templates

### Available Templates (in `lib/og-templates.tsx`)

1. **BaseOGTemplate** - Generic template with brand colors
2. **ProductOGTemplate** - For product pages (includes price, category)
3. **ServiceOGTemplate** - For service pages (includes package type, pricing)
4. **HomepageOGTemplate** - For the homepage
5. **GenericPageOGTemplate** - For static pages (about, gallery, etc.)

### Brand Colors

```typescript
background: '#000000' (Black)
foreground: '#FFFFFF' (White)
secondary: '#FFB6C1'  (Light Pink - brand color)
muted: '#F5F5F5'      (Light gray)
```

## Testing OG Images

### Local Testing

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Access OG images directly:**
   - Homepage: http://localhost:3000/opengraph-image
   - Products: http://localhost:3000/products/opengraph-image
   - Product detail: http://localhost:3000/products/[id]/opengraph-image
   - Services: http://localhost:3000/services/opengraph-image

3. **View in browser DevTools:**
   - Open any page
   - View page source (Ctrl+U / Cmd+U)
   - Search for `og:image` to see the OG image URL

### Production Testing

Use these tools to preview how your pages will look when shared:

1. **Facebook Sharing Debugger**
   - URL: https://developers.facebook.com/tools/debug/
   - Paste your page URL to see preview
   - Use "Scrape Again" to refresh cache

2. **Twitter Card Validator**
   - URL: https://cards-dev.twitter.com/validator
   - Paste your page URL to see preview
   - Note: Requires Twitter developer access

3. **LinkedIn Post Inspector**
   - URL: https://www.linkedin.com/post-inspector/
   - Paste your page URL to see preview

4. **Open Graph Debugger (Multi-platform)**
   - URL: https://www.opengraph.xyz/
   - Tests multiple platforms at once

## Metadata Configuration

### Environment Variables

Set in `.env.local` or `.env.production`:

```bash
# Used for generating absolute URLs in OG metadata
NEXT_PUBLIC_SITE_URL=https://glambylynn.com
```

### Site Configuration

Edit `src/lib/metadata.ts` to update:
- Site name
- Default description
- Social media links
- Default keywords

## Creating New OG Images

### For a New Page

1. **Create opengraph-image.tsx in the route directory:**

```typescript
import { ImageResponse } from '@vercel/og';
import { GenericPageOGTemplate } from '@/lib/og-templates';

export const runtime = 'edge';
export const alt = 'Page Title - Glam by Lynn';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    <GenericPageOGTemplate
      title="Your Page Title"
      description="Your page description"
    />,
    { ...size }
  );
}
```

2. **Create twitter-image.tsx (same structure)**

### For a Dynamic Page (with data fetching)

See `app/products/[id]/opengraph-image.tsx` for example:
- Fetch data in the Image component
- Handle loading states
- Provide fallback for errors

## Troubleshooting

### OG Image Not Showing

1. **Check build output:**
   ```bash
   npm run build
   ```
   Look for OG image routes in the build output

2. **Verify environment variables:**
   ```bash
   echo $NEXT_PUBLIC_SITE_URL
   ```

3. **Clear social media cache:**
   - Use platform debuggers (above) to force refresh
   - Social platforms cache OG images for 24-48 hours

### Image Not Loading in Production

1. **Check Edge Runtime compatibility:**
   - Ensure all code in opengraph-image.tsx is Edge-compatible
   - Avoid Node.js-only APIs

2. **Verify image generation:**
   - Check Vercel function logs
   - Ensure @vercel/og is in dependencies (not devDependencies)

### Image Looks Wrong

1. **Test locally first:**
   - Visit the opengraph-image URL directly
   - Adjust templates in `lib/og-templates.tsx`

2. **Check font loading:**
   - @vercel/og has limited font support
   - Use system fonts or load custom fonts

## Best Practices

1. **Keep images simple:**
   - Focus on key information
   - Use high contrast
   - Ensure text is readable at small sizes

2. **Test on multiple platforms:**
   - Facebook, Twitter, LinkedIn look different
   - WhatsApp shows thumbnails differently

3. **Update regularly:**
   - When product details change
   - When brand guidelines update

4. **Monitor performance:**
   - OG images are generated on-demand
   - First generation might be slow
   - Subsequent requests are cached

## Resources

- [Next.js OG Image Generation](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image)
- [Vercel OG Library](https://vercel.com/docs/functions/edge-functions/og-image-generation)
- [Open Graph Protocol](https://ogp.me/)
- [Twitter Cards Documentation](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)

## Support

For issues or questions about OG images:
1. Check this documentation
2. Test with platform debuggers
3. Review Next.js and @vercel/og documentation
4. Check build logs for errors
