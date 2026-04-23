import { expect, Page, test } from "@playwright/test";
import { authenticateBuilderSession, skipIfNoAdminToken } from "./helpers/auth";

async function openAuthenticatedBuilder(page: Page) {
  await authenticateBuilderSession(page);
  await page.goto("/builder.html");
  if (/\/admin\.html$/.test(page.url())) {
    await authenticateBuilderSession(page);
    await page.goto("/builder.html");
  }
  await expect(page).toHaveURL(/\/builder\.html/);
  await page.waitForFunction(() => Boolean((window as Window & { __grEditor?: unknown }).__grEditor), null, {
    timeout: 30000
  });
  await expect(page.locator(".gjs-frame")).toBeVisible({ timeout: 30000 });
}

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
    await openAuthenticatedBuilder(page);
    await expect(page.locator(".builder-toolbar")).toBeVisible();
    await expect(page.locator(".builder-toolbar")).toHaveScreenshot("builder-toolbar.png", {
      maxDiffPixelRatio: 0.02
    });
  });

  test("builder blocks panel baseline", async ({ page }) => {
    skipIfNoAdminToken();
    await openAuthenticatedBuilder(page);

    const blocksPanel = page
      .locator(".gjs-blocks-c")
      .filter({ has: page.locator(".gjs-block") })
      .first();
    await expect(blocksPanel).toBeVisible();
    await expect(blocksPanel).toHaveScreenshot("builder-blocks-panel.png", {
      maxDiffPixelRatio: 0.02
    });
  });

  test("builder modal overlay baseline", async ({ page }) => {
    skipIfNoAdminToken();
    await openAuthenticatedBuilder(page);

    await page.evaluate(() => {
      const editor = (window as Window & { __grEditor?: { runCommand: (name: string) => void } }).__grEditor;
      if (!editor) {
        throw new Error("Builder editor is not initialized.");
      }
      editor.runCommand("open-assets");
    });

    const modal = page.locator(".gjs-mdl-dialog");
    await expect(modal).toBeVisible();
    await expect(page.locator(".gjs-mdl-container")).toHaveScreenshot("builder-modal-overlay.png", {
      maxDiffPixelRatio: 0.02
    });
  });
});
