import { test, expect, type Page } from "@playwright/test";

import { hasSessionCookie, mintSessionCookie, SESSION_COOKIE, setSession } from "../helpers/session";

/**
 * When a signed-in user's session expires they go to the HOMEPAGE — they
 * didn't ask to sign in, their session ran out. Someone who ARRIVES signed out
 * at a page that needs an account still goes to sign-in, returning afterwards.
 *
 * Before this was fixed, an expired session went to /auth/signin by several
 * routes (the Header's token poll, page guards, a 401 handler), and the stale
 * session cookie was never cleared. Run against the old code, the "expired"
 * cases below fail.
 *
 * Needs NEXTAUTH_SECRET set to the server's value — see helpers/session.ts.
 */
test.skip(!process.env.NEXTAUTH_SECRET, "NEXTAUTH_SECRET must match the server under test");

const pathOf = (page: Page) => {
  const url = new URL(page.url());
  return url.pathname + url.search;
};

async function settles(page: Page, predicate: (url: URL) => boolean) {
  await page.waitForURL(predicate, { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(1_500);
}

test.describe("session expiry", () => {
  test("an expired session on a protected page goes home and is cleared", async ({ page, context, baseURL }) => {
    await setSession(context, baseURL!, { expired: true });

    await page.goto("/orders");
    await settles(page, (u) => u.pathname === "/" || u.pathname.startsWith("/auth"));

    expect(pathOf(page)).toBe("/");
    expect(await hasSessionCookie(context, baseURL!)).toBe(false);
  });

  test("an expired session on the homepage stays home, signed out", async ({ page, context, baseURL }) => {
    await setSession(context, baseURL!, { expired: true });

    await page.goto("/");
    await page.waitForTimeout(4_000);

    expect(pathOf(page)).toBe("/");
    expect(await hasSessionCookie(context, baseURL!)).toBe(false);
  });

  test("an expired admin goes home rather than to sign-in", async ({ page, context, baseURL }) => {
    await setSession(context, baseURL!, { expired: true, isAdmin: true });

    await page.goto("/admin/orders");
    await settles(page, (u) => u.pathname === "/" || u.pathname.startsWith("/auth"));

    expect(pathOf(page)).toBe("/");
  });

  test("signed in, then the session expires mid-visit → homepage", async ({ page, context, baseURL }) => {
    await setSession(context, baseURL!);
    await page.goto("/orders");
    await page.waitForTimeout(2_500);
    expect(pathOf(page)).toBe("/orders");

    // The refresh token runs out, and NextAuth re-reads the session on focus.
    await context.addCookies([
      { name: SESSION_COOKIE, value: await mintSessionCookie({ expired: true }), url: baseURL! },
    ]);
    await page.evaluate(() => {
      document.dispatchEvent(new Event("visibilitychange"));
      window.dispatchEvent(new Event("focus"));
    });
    await settles(page, (u) => u.pathname !== "/orders");

    expect(pathOf(page)).toBe("/");
  });

  test("a valid session is left alone past the first token check", async ({ page, context, baseURL }) => {
    await setSession(context, baseURL!);

    await page.goto("/orders");
    await page.waitForTimeout(8_000);

    expect(pathOf(page)).toBe("/orders");
    expect(await hasSessionCookie(context, baseURL!)).toBe(true);
  });
});

test.describe("arriving signed out", () => {
  for (const path of ["/orders", "/bookings", "/wishlist"]) {
    test(`${path} sends an anonymous visitor to sign-in, returning afterwards`, async ({ page }) => {
      await page.goto(path);
      await settles(page, (u) => u.pathname.startsWith("/auth/signin"));

      expect(pathOf(page)).toBe(`/auth/signin?redirect=${encodeURIComponent(path)}`);
    });
  }

  test("/admin sends an anonymous visitor to sign-in (the proxy)", async ({ page }) => {
    await page.goto("/admin/orders");

    expect(pathOf(page)).toMatch(/^\/auth\/signin/);
  });
});
