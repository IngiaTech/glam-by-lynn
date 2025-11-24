# Favicon Setup Guide

## Current Favicon Files

All favicon assets are located in `/public/` directory (root level):

```
frontend/public/
├── favicon.ico                    # Main favicon (16x16, 32x32, 48x48)
├── favicon-16x16.png             # 16x16 PNG favicon
├── favicon-32x32.png             # 32x32 PNG favicon
├── apple-touch-icon.png          # 180x180 for Apple devices
├── android-chrome-192x192.png    # 192x192 for Android
├── android-chrome-512x512.png    # 512x512 for Android
└── site.webmanifest              # Web app manifest
```

## How They're Used

### Browsers
- **favicon.ico** - Displayed in browser tabs, bookmarks
- **favicon-16x16.png** - High-res fallback for modern browsers
- **favicon-32x32.png** - Retina displays

### Mobile Devices
- **apple-touch-icon.png** - iOS home screen icon (when user adds site)
- **android-chrome-192x192.png** - Android home screen (standard)
- **android-chrome-512x512.png** - Android splash screens

### Web App Manifest
- **site.webmanifest** - Progressive Web App configuration
  - Defines app name: "Glam by Lynn"
  - Theme color: Black (#000000)
  - Background color: Black (#000000)
  - References Android icons

## Metadata Configuration

Favicons are automatically referenced in `src/lib/metadata.ts`:

```typescript
icons: {
  icon: '/favicon.ico',
  shortcut: '/favicon-16x16.png',
  apple: '/apple-touch-icon.png',
},
manifest: '/site.webmanifest',
```

## Testing Your Favicons

### Local Testing
1. Start dev server: `npm run dev`
2. Open http://localhost:3000
3. Check browser tab for favicon
4. Open DevTools → Application → Manifest to verify

### Production Testing
1. After deployment, check your site URL
2. Verify in multiple browsers:
   - Chrome/Edge (Windows, Mac, Android)
   - Safari (Mac, iOS)
   - Firefox

### Mobile Testing
**iOS:**
1. Safari → Share → Add to Home Screen
2. Check icon on home screen
3. Open app and verify splash screen

**Android:**
1. Chrome → Menu → Add to Home Screen
2. Check icon on home screen
3. Open app and verify splash screen

## Favicon Tools

### Generate New Favicons
If you need to create favicons from a logo:
- **Favicon.io** - https://favicon.io/
- **RealFaviconGenerator** - https://realfavicongenerator.net/

### Test Favicons
- **Favicon Checker** - https://realfavicongenerator.net/favicon_checker

## Updating Favicons

To update your favicons:

1. **Generate new set** using a favicon generator (provide your logo)
2. **Replace files** in `/public/` directory
3. **Update site.webmanifest** if needed (colors, name)
4. **Clear browser cache** (Ctrl+Shift+R / Cmd+Shift+R)
5. **Test** on multiple devices

## Common Issues

### Favicon Not Showing
- **Clear cache**: Hard refresh (Ctrl+Shift+R)
- **Check file path**: Must be in `/public/` root
- **Verify file size**: favicon.ico should be < 100KB
- **Check build**: Ensure files copied during build

### Wrong Favicon Showing
- **Browser cache**: Clear cache and cookies
- **Old service worker**: Update or clear service workers
- **CDN cache**: May take time to propagate

### Mobile Icon Issues
- **iOS**: Must be exactly 180x180px (apple-touch-icon.png)
- **Android**: Needs 192x192 and 512x512 variants
- **Manifest**: Verify site.webmanifest paths are correct

## Best Practices

1. **Keep it simple**: Favicon should work at 16x16px
2. **High contrast**: Ensure visibility on light/dark backgrounds
3. **Test small sizes**: View at actual size (16x16, 32x32)
4. **Consistent branding**: Match your logo/brand colors
5. **Optimize file size**: Compress PNGs, keep ICO < 100KB

## Current Brand Colors

Your site uses these colors:
- **Primary**: Black (#000000)
- **Accent**: Light Pink (#FFB6C1)
- **Text**: White (#FFFFFF)

Ensure your favicon is visible and recognizable with these colors.
