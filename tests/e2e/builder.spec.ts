import { expect, Page, test } from "@playwright/test";
import { authenticateBuilderSession, skipIfNoAdminToken } from "./helpers/auth";

async function openBuilder(page: Page) {
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

test.describe("Builder authenticated UX", () => {
  skipIfNoAdminToken();

  test("toolbar and options are visible", async ({ page }) => {
    await openBuilder(page);

    await expect(page.locator(".builder-toolbar")).toBeVisible();
    await expect(page.locator("#builder-page")).toBeVisible();
    await expect(page.locator("#builder-preview")).toBeVisible();
    await expect(page.locator("#builder-save-draft")).toBeVisible();
    await expect(page.locator("#builder-publish")).toBeVisible();
    await expect(page.locator("#builder-reset")).toBeVisible();
    await expect(page.locator("#builder-logout")).toBeVisible();
  });

  test("page selector switches to legal page and updates status", async ({ page }) => {
    await openBuilder(page);

    const pageSelect = page.locator("#builder-page");
    await expect(pageSelect).toBeVisible();
    await pageSelect.selectOption("mentions-legales");

    await expect(page.locator("#builder-editor-status")).toContainText("mentions-legales");

    const frame = page.frameLocator(".gjs-frame");
    await expect(frame.locator("main.legal-main")).toBeVisible();
    await expect(frame.locator("h1")).toContainText("Mentions légales");
  });

  test("version-1 shows migrated contact section and not legacy form", async ({ page }) => {
    await openBuilder(page);
    await page.locator("#builder-page").selectOption("version-1");

    const frame = page.frameLocator(".gjs-frame");
    await expect(frame.locator("section#contact")).toBeVisible();
    await expect(frame.locator('a[href="https://wa.me/262693103908"]')).toBeVisible();
    await expect(frame.locator("form")).toHaveCount(0);
  });

  test("selected page persists after reload", async ({ page }) => {
    await openBuilder(page);
    await page.locator("#builder-page").selectOption("politique-cookies");
    await expect(page.locator("#builder-editor-status")).toContainText("politique-cookies");

    await page.reload();
    if (/\/admin\.html$/.test(page.url())) {
      await openBuilder(page);
    }
    await expect(page.locator("#builder-page")).toHaveValue("politique-cookies");
    await expect(page.locator("#builder-editor-status")).toContainText("politique-cookies");
  });

  test("panel icons expose descriptive tooltips", async ({ page }) => {
    await openBuilder(page);

    const unlabeledCount = await page.locator(".gjs-pn-btn").evaluateAll((buttons) => {
      return buttons.filter((button) => {
        const title = button.getAttribute("title") || "";
        const ariaLabel = button.getAttribute("aria-label") || "";
        return !title.trim() && !ariaLabel.trim();
      }).length;
    });

    expect(unlabeledCount).toBe(0);
  });
});
