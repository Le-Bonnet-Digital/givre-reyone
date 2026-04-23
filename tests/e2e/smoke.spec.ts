import { expect, test } from "@playwright/test";

test.describe("Smoke navigation", () => {
  test("home renders key sections and contact anchor", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("body")).toHaveAttribute("data-page", "version-1");
    await expect(page.locator(".v1-hero")).toBeVisible();
    await expect(page.locator("#contact")).toBeVisible();

    await page.click('a[href="#contact"]');
    await expect(page.locator("#contact")).toBeInViewport();
  });

  test("legal pages render main content", async ({ page }) => {
    const legalPages = [
      "/mentions-legales.html",
      "/politique-confidentialite.html",
      "/politique-cookies.html",
      "/cgu-cgv.html"
    ];

    for (const path of legalPages) {
      await page.goto(path);
      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator("h1")).toBeVisible();
    }
  });

  test("admin page shows login form", async ({ page }) => {
    await page.goto("/admin.html");
    await expect(page.locator("#admin-login-form")).toBeVisible();
    await expect(page.locator("#admin-token")).toBeVisible();
  });

  test("builder redirects to admin when unauthenticated", async ({ page }) => {
    await page.goto("/builder.html");
    await expect(page).toHaveURL(/\/admin\.html$/);
  });
});
