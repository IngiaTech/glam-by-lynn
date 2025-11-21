import { test, expect } from '@playwright/test';

/**
 * Example test to verify Playwright setup
 * This test can be run to verify the testing infrastructure is working
 */

test.describe('Homepage', () => {
  test('should load and display main navigation', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check that the page title is correct
    await expect(page).toHaveTitle(/Glam by Lynn/i);

    // Check that main navigation elements are visible
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Check for key navigation links
    const productsLink = page.locator('a:has-text("Products")');
    const servicesLink = page.locator('a:has-text("Services")');

    await expect(productsLink.or(page.locator('nav >> text=Products'))).toBeVisible();
    await expect(servicesLink.or(page.locator('nav >> text=Services'))).toBeVisible();
  });

  test('should display brand logo', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for logo or brand name
    const logo = page.locator('img[alt*="Glam" i]').or(
      page.locator('text="Glam by Lynn"')
    );
    await expect(logo).toBeVisible();
  });

  test('should have functional cart icon', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for cart icon or link
    const cartIcon = page.locator('a[href*="/cart"]').or(
      page.locator('[data-testid="cart-icon"]')
    );

    // Cart should be visible
    await expect(cartIcon).toBeVisible({ timeout: 5000 });
  });
});
