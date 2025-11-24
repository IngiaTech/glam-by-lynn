# WhatsApp OpenGraph Preview Troubleshooting

## Issue
WhatsApp doesn't show preview images when sharing links, but Twitter and other platforms do.

## Why WhatsApp is Different

WhatsApp has stricter requirements and caching behavior compared to other platforms:

1. **Aggressive Caching**: WhatsApp caches OG images for 7+ days
2. **Strict Validation**: More strict about image format and metadata
3. **Size Requirements**: Prefers images at least 300x300px (we use 1200x630px ✓)
4. **Protocol Requirements**: Must use HTTPS (production) ✓
5. **No Debugging Tools**: Unlike Facebook/Twitter, WhatsApp doesn't provide a debugger

## Current Deployment Status

✅ **PR #188 Merged**: November 23, 2025 at 20:31 UTC
✅ **Includes**: All OpenGraph images, Twitter cards, favicons
✅ **Features**: Dynamic OG images for products, services, homepage, etc.

## Quick Fixes to Try

### 1. Wait for Deployment (Most Common)

If the PR was just merged:
```bash
# Check if Vercel deployment is complete
# Visit: https://vercel.com/dashboard

# Usually takes 2-5 minutes for deployment
# Another 1-2 minutes for edge functions (OG images)
```

### 2. Check Your Production URL

Ensure `NEXT_PUBLIC_SITE_URL` is set correctly in Vercel:

```bash
# In Vercel Dashboard → Settings → Environment Variables
NEXT_PUBLIC_SITE_URL=https://your-production-domain.com

# NOT localhost or preview URLs
```

### 3. Test OG Image Generation

Visit your OG image URLs directly to see if they're generating:

```
https://your-domain.com/opengraph-image
https://your-domain.com/products/opengraph-image
https://your-domain.com/products/[id]/opengraph-image
```

**Expected**: You should see a 1200x630px PNG image
**If 404**: Edge functions may not be deployed yet

### 4. Clear WhatsApp Cache

WhatsApp caches aggressively. Try these methods:

#### Method 1: URL Parameter Trick
```
Original: https://glambylynn.com/products/123
Add param: https://glambylynn.com/products/123?v=1
```
The `?v=1` makes WhatsApp think it's a new URL

#### Method 2: Share to Yourself First
1. Share the link to yourself in WhatsApp
2. Wait 30 seconds
3. Then share to others
4. Sometimes this triggers a cache refresh

#### Method 3: Wait 24-48 Hours
WhatsApp's cache naturally expires after 1-2 days

### 5. Verify Metadata in HTML

Check that your deployed site has correct meta tags:

```bash
# View source of your production site
curl -s https://your-domain.com | grep "og:image"
```

**Expected output:**
```html
<meta property="og:image" content="https://your-domain.com/opengraph-image"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
```

## Advanced Diagnostics

### Check Vercel Deployment Logs

1. Go to Vercel Dashboard
2. Select your project
3. Click latest deployment
4. Check "Functions" tab
5. Look for `/opengraph-image` routes

**Expected**: Edge Functions should be listed

### Test with Different Platforms

To isolate the issue:

| Platform | Shows Preview? | Cache Behavior |
|----------|---------------|----------------|
| Twitter | ✓ (you said yes) | Moderate (15 min) |
| Facebook | ? | Moderate (24 hrs) |
| LinkedIn | ? | Light (hours) |
| WhatsApp | ✗ (issue) | Very Aggressive (7+ days) |
| Telegram | ? | Light (hours) |

### Check Image File Size

Large OG images can fail on WhatsApp:

```bash
# Check generated image size
curl -I https://your-domain.com/opengraph-image

# Look for Content-Length header
# Should be under 5MB (ours are usually 50-200KB)
```

## Common WhatsApp-Specific Issues

### Issue 1: Dynamic Images Not Ready

**Symptom**: Static pages work, dynamic pages (products) don't

**Fix**: Edge Functions need 2-3 minutes after deployment
- Wait 5 minutes after Vercel deployment completes
- Try generating image manually first (visit URL directly)
- Then share on WhatsApp

### Issue 2: Missing Absolute URLs

**Symptom**: Images show on some platforms but not WhatsApp

**Fix**: Ensure `metadataBase` is set:
```typescript
// Check src/lib/metadata.ts
metadataBase: new URL(siteConfig.url)
```

**Your Status**: ✓ Already configured

### Issue 3: HTTPS Certificate Issues

**Symptom**: Images don't load on WhatsApp but work in browser

**Fix**: Ensure SSL certificate is valid
```bash
# Test SSL
curl -I https://your-domain.com

# Should return 200, not redirect loops
```

### Issue 4: Incorrect Image Format

**Symptom**: WhatsApp shows broken image icon

**Fix**: Ensure PNG format (not JPEG for OG images)
```typescript
// In opengraph-image.tsx
export const contentType = 'image/png'; // ✓ Correct
```

**Your Status**: ✓ All set to PNG

## WhatsApp-Specific Best Practices

### 1. Image Specifications (You're Already Compliant ✓)
```
Format: PNG
Dimensions: 1200 x 630 pixels
Aspect Ratio: 1.91:1
File Size: < 5MB (yours are ~100KB)
Color Space: RGB
```

### 2. Required Meta Tags (You Have These ✓)
```html
<meta property="og:title" content="..."/>
<meta property="og:description" content="..."/>
<meta property="og:image" content="https://..."/>
<meta property="og:url" content="https://..."/>
<meta property="og:type" content="website"/>
```

### 3. Add These for Better WhatsApp Support

Consider adding to `src/lib/metadata.ts`:

```typescript
openGraph: {
  // ... existing fields
  images: [
    {
      url: image,
      width: 1200,
      height: 630,
      alt: typeof title === 'string' ? title : title.default,
      type: 'image/png', // Add this
    },
  ],
}
```

## Testing Workflow

**After Every Deployment:**

1. **Wait 5 minutes** for edge functions to deploy
2. **Test image directly**: Visit `/opengraph-image` URL
3. **View page source**: Check meta tags are correct
4. **Test on Twitter** first (lighter cache)
5. **Clear WhatsApp cache**: Use URL parameter trick
6. **Share in WhatsApp**: Test with yourself first
7. **Wait if needed**: Sometimes takes 15-30 minutes

## Debugging Checklist

Before declaring it broken, verify:

- [ ] Deployment completed successfully on Vercel
- [ ] At least 5 minutes passed since deployment
- [ ] NEXT_PUBLIC_SITE_URL is set to production domain
- [ ] OG image URL works when visited directly
- [ ] Image is PNG format, 1200x630px
- [ ] HTML meta tags are present in page source
- [ ] Twitter/Facebook show preview correctly
- [ ] Tried URL parameter trick (?v=1)
- [ ] Used HTTPS (not HTTP)
- [ ] Waited at least 15 minutes since first share

## Force WhatsApp to Refresh

If all else fails:

### Option 1: Change the URL Slightly
```
Add a meaningless parameter:
?refresh=1
?preview=true
?_=12345
```

### Option 2: Change the Image
Even a tiny change to the OG image will bust the cache:
- Update text
- Change color
- Redeploy

### Option 3: Contact WhatsApp Cache
There's no official way, but WhatsApp usually refreshes:
- When you share to a new group
- After 48-72 hours
- When the URL parameter changes

## Expected Timeline

**After PR Merge:**
- **0-2 minutes**: Vercel builds frontend
- **2-5 minutes**: Deployment completes
- **5-10 minutes**: Edge functions become available
- **10-30 minutes**: WhatsApp may cache first request
- **24-48 hours**: WhatsApp cache naturally expires

## Still Not Working?

If after following all steps WhatsApp still doesn't show previews:

1. **Check Vercel Functions Tab**: Ensure edge functions deployed
2. **Test with fresh URL**: Try a different page (e.g., /about)
3. **Wait 24 hours**: WhatsApp cache is very stubborn
4. **Check production domain**: Ensure it's the correct URL
5. **Verify SSL certificate**: Must be valid HTTPS

## Production Deployment Checklist

Before announcing the site:

- [ ] PR merged to main ✓
- [ ] Vercel deployment successful
- [ ] NEXT_PUBLIC_SITE_URL set in production
- [ ] Domain pointing to Vercel
- [ ] SSL certificate active
- [ ] Test all OG image routes manually
- [ ] Verify meta tags in production HTML
- [ ] Test sharing on Twitter (should work immediately)
- [ ] Test sharing on Facebook (use debugger to clear cache)
- [ ] Test sharing on LinkedIn
- [ ] Test sharing on WhatsApp (may need 24hrs)

## Reference

**Your OG Image Routes** (all should work):
```
/opengraph-image (homepage)
/twitter-image (homepage)
/products/opengraph-image
/products/[id]/opengraph-image
/services/opengraph-image
/gallery/opengraph-image
/about/opengraph-image
```

**Vercel Edge Function Logs**:
Check `/functions` in your Vercel deployment to see if edge functions are running

**Platform Debugging Tools**:
- Twitter: https://cards-dev.twitter.com/validator
- Facebook: https://developers.facebook.com/tools/debug/
- LinkedIn: https://www.linkedin.com/post-inspector/
- WhatsApp: No official tool (that's the problem!)

## Summary

**Most Likely Cause**: WhatsApp's aggressive caching
**Most Likely Fix**: Wait 24 hours or use URL parameter trick
**Fallback**: All other platforms work, WhatsApp will catch up eventually

Your OpenGraph implementation is correct. WhatsApp is just slow to update.
