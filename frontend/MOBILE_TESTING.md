# Mobile Responsiveness Testing Guide

This document provides guidelines and checklists for testing and ensuring mobile responsiveness across the Glam by Lynn application.

## Testing Devices & Viewports

### Minimum Supported Viewports
- **Mobile Small**: 320px (iPhone SE)
- **Mobile Medium**: 375px (iPhone 12/13)
- **Mobile Large**: 414px (iPhone 14 Pro Max)
- **Tablet**: 768px (iPad)
- **Desktop**: 1024px+

### Test Devices
- iOS: iPhone SE, iPhone 12/13, iPhone 14 Pro Max, iPad
- Android: Samsung Galaxy S21, Pixel 5, various tablets
- Browsers: Safari (iOS), Chrome (Android), Firefox, Edge

## Testing Checklist

### Layout & Spacing
- [ ] No horizontal scrolling on any viewport
- [ ] Content fits within viewport width
- [ ] Adequate padding/margins on all sides (minimum 16px)
- [ ] Text doesn't overflow containers
- [ ] Images scale properly
- [ ] Grid layouts stack appropriately on mobile
- [ ] Cards and containers have proper spacing

### Typography
- [ ] Font sizes readable (minimum 16px for body text)
- [ ] Line height adequate (1.5-1.6 for body text)
- [ ] Headings scale down on mobile
- [ ] No text overlap
- [ ] Proper text wrapping

### Touch Targets
- [ ] Buttons minimum 44x44px (Apple HIG)
- [ ] Links have adequate spacing (minimum 8px between)
- [ ] Form inputs easy to tap
- [ ] Icon buttons large enough
- [ ] No accidental tap zones

### Navigation
- [ ] Mobile menu accessible
- [ ] Hamburger menu opens/closes properly
- [ ] Navigation items clearly visible
- [ ] Dropdowns work on touch devices
- [ ] Close buttons easy to tap

### Forms
- [ ] Input fields full width or adequately sized
- [ ] Labels visible and associated with inputs
- [ ] Error messages displayed clearly
- [ ] Submit buttons prominent
- [ ] Keyboard covers input when focused
- [ ] Auto-zoom disabled (font-size >= 16px)
- [ ] Proper input types for mobile keyboards

### Images & Media
- [ ] Images load on mobile networks
- [ ] Responsive images serve correct sizes
- [ ] Video players mobile-friendly
- [ ] Image galleries work with touch
- [ ] Lazy loading implemented

### Performance
- [ ] Page loads < 3s on 3G
- [ ] Images optimized for mobile
- [ ] Minimal layout shift (CLS < 0.1)
- [ ] Smooth scrolling
- [ ] No janky animations

### Content
- [ ] Tables scroll horizontally or stack on mobile
- [ ] Long URLs don't break layout
- [ ] Lists properly formatted
- [ ] Modals/dialogs fit on screen
- [ ] Tooltips accessible on touch

## Common Mobile Issues & Fixes

### Issue: Horizontal Scrolling

**Cause**: Fixed widths, large images, or content overflow

**Fix**:
```css
/* Ensure containers don't exceed viewport */
.container {
  max-width: 100%;
  overflow-x: hidden;
}

/* Make images responsive */
img {
  max-width: 100%;
  height: auto;
}
```

### Issue: Small Touch Targets

**Cause**: Buttons or links too small

**Fix**:
```tsx
// Tailwind CSS - Ensure minimum size
<Button className="min-h-[44px] min-w-[44px] px-4 py-2">
  Click Me
</Button>

// Add padding to links
<Link className="inline-block py-3 px-4" href="/page">
  Link Text
</Link>
```

### Issue: Text Too Small

**Cause**: Font size less than 16px

**Fix**:
```css
/* Minimum body text size */
body {
  font-size: 16px;
}

/* Headings scale down on mobile */
h1 {
  @apply text-2xl md:text-4xl;
}
```

### Issue: Form Input Zoom on iOS

**Cause**: Input font-size < 16px triggers auto-zoom

**Fix**:
```tsx
<Input
  className="text-base" // 16px minimum
  type="email"
/>
```

### Issue: Fixed Position Elements Cover Content

**Cause**: Fixed headers/footers on small screens

**Fix**:
```tsx
// Add bottom padding to account for fixed elements
<main className="pb-20 md:pb-0">
  {content}
</main>
```

### Issue: Tables Overflow

**Cause**: Wide tables on narrow screens

**Fix**:
```tsx
<div className="overflow-x-auto">
  <table className="min-w-full">
    {/* table content */}
  </table>
</div>
```

## Responsive Breakpoints

Tailwind CSS breakpoints used in the project:

```
sm: 640px   // Small devices
md: 768px   // Medium devices (tablets)
lg: 1024px  // Large devices (desktops)
xl: 1280px  // Extra large devices
2xl: 1536px // XXL devices
```

### Mobile-First Approach

Always design for mobile first, then enhance for larger screens:

```tsx
// ✅ Good - Mobile first
<div className="flex-col md:flex-row">

// ❌ Bad - Desktop first
<div className="flex-row sm:flex-col">
```

## Testing Tools

### Browser DevTools
```
Chrome DevTools:
1. Open DevTools (F12)
2. Click Toggle Device Toolbar (Ctrl+Shift+M)
3. Select device or enter custom dimensions
4. Test different orientations
```

### Online Tools
- [Responsive Design Checker](https://responsivedesignchecker.com/)
- [BrowserStack](https://www.browserstack.com/) - Real device testing
- [LambdaTest](https://www.lambdatest.com/) - Cross-browser testing

### Lighthouse Mobile Audit
```bash
# Run Lighthouse in mobile mode
npx lighthouse http://localhost:3000 --view --preset=mobile
```

## Page-Specific Checks

### Homepage
- [ ] Hero section displays properly
- [ ] CTA buttons prominent
- [ ] Featured products grid responsive
- [ ] Image carousel works with swipe

### Product Pages
- [ ] Image gallery swipeable
- [ ] Variant selectors easy to tap
- [ ] Add to cart button accessible
- [ ] Product details readable

### Checkout
- [ ] Form fields adequate size
- [ ] Address selection works
- [ ] Payment options clear
- [ ] Order summary visible

### Navigation
- [ ] Mobile menu slides in/out smoothly
- [ ] All links accessible
- [ ] Search bar usable
- [ ] Cart icon visible

### Forms
- [ ] Contact form fields properly sized
- [ ] Date pickers mobile-friendly
- [ ] File uploads work
- [ ] Validation messages clear

## Accessibility on Mobile

### Touch Gestures
- Swipe to navigate (where appropriate)
- Pinch to zoom on images
- Long press for context menus

### Screen Readers
- Proper heading hierarchy
- ARIA labels for icon buttons
- Form labels associated with inputs
- Focus indicators visible

### Contrast
- Minimum 4.5:1 for normal text
- Minimum 3:1 for large text
- Adequate contrast in light/dark modes

## Performance Optimization

### Images
```tsx
// Use Next.js Image with priority for above-fold
<Image
  src="/hero.jpg"
  priority={true}
  sizes="(max-width: 768px) 100vw, 50vw"
/>
```

### Code Splitting
```tsx
// Lazy load heavy components
const HeavyComponent = dynamic(() => import('./Heavy'), {
  loading: () => <Loader />
})
```

### Network Detection
```tsx
import { isSlowConnection } from '@/lib/performance'

// Load lighter version on slow connections
{isSlowConnection() ? <LightImage /> : <FullImage />}
```

## Manual Testing Script

For each page:

1. **Load Test**
   - Open page on mobile
   - Check load time (< 3s)
   - Verify no errors in console

2. **Layout Test**
   - Scroll vertically (no horizontal scroll)
   - Check spacing and alignment
   - Verify images load and scale

3. **Interaction Test**
   - Tap all buttons and links
   - Fill out any forms
   - Test navigation menu
   - Try search functionality

4. **Orientation Test**
   - Rotate device to landscape
   - Verify layout adapts
   - Check that content is still accessible

5. **Performance Test**
   - Enable slow 3G throttling
   - Reload page
   - Verify acceptable load time
   - Check lazy loading works

## Automated Testing

### Visual Regression Testing
```bash
# Using Percy or similar tool
npm run test:visual
```

### Responsive Testing
```typescript
// Example Playwright test
test('mobile navigation works', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto('/')
  await page.click('[aria-label="Open menu"]')
  await expect(page.locator('nav')).toBeVisible()
})
```

## Fix Priority

**High Priority** (Breaking Issues):
- Horizontal scrolling
- Content not visible
- Forms unusable
- Navigation broken

**Medium Priority** (UX Issues):
- Small touch targets
- Poor spacing
- Slow load times
- Minor layout shifts

**Low Priority** (Polish):
- Animation smoothness
- Micro-interactions
- Advanced gestures
- Edge case devices

## Resources

- [Google Mobile-Friendly Test](https://search.google.com/test/mobile-friendly)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/ios/visual-design/adaptivity-and-layout/)
- [Material Design Touch Targets](https://material.io/design/usability/accessibility.html#layout-and-typography)
- [WCAG 2.1 Mobile Accessibility](https://www.w3.org/WAI/standards-guidelines/mobile/)
