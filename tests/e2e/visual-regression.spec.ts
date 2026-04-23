import { expect, test } from "@playwright/test";
import { authenticateBuilderSession, skipIfNoAdminToken } from "./helpers/auth";

test.describe("Visual regression baseline", () => {
  test("home baseline", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveScreenshot("home.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02
    });
  });

  test("admin login baseline", async ({ page }) => {
    await page.goto("/admin.html");
    await expect(page.locator(".builder-login-card")).toBeVisible();
    await expect(page).toHaveScreenshot("admin-login.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02
    });
  });

  test("builder toolbar baseline", async ({ page }) => {
    skipIfNoAdminToken();
    await authenticateBuilderSession(page);
    await page.goto("/builder.html");
    await expect(page).toHaveURL(/\/builder\.html/);
    await expect(page.locator(".builder-toolbar")).toBeVisible();
    await expect(page.locator(".builder-toolbar")).toHaveScreenshot("builder-toolbar.png", {
      maxDiffPixelRatio: 0.02
    });
  });
});
