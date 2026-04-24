import { expect, test } from "@playwright/test";

test.describe("Smoke navigation", () => {
  test("home inlines published content in initial HTML without runtime shell fetch", async ({ page }) => {
    const response = await page.goto("/");
    const body = await response?.text();
    expect(body).toContain('class="v1-header"');
    expect(body).toContain('class="v1-hero"');
    expect(body).toContain('class="v1-section v1-section-product"');
    expect(body).toContain('class="v1-section v1-section-contact"');
    expect(body).toContain('id="page-custom-css"');
    expect(body).toContain("hero-lcp-800.webp");
    expect(body).toContain("hero-lcp-400.webp");
    expect(body).not.toContain("/api/page-content");
    expect(body).not.toContain("public.blob.vercel-storage.com");
    expect(body).not.toContain("page-shell-home");
  });

  test("home renders key sections and contact anchor", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/Givre Reyone|Givré Réyoné/);
    await expect(page.locator("body")).toHaveAttribute("data-page", "version-1");
    await expect(page.locator(".v1-hero")).toBeVisible();
    await expect(page.locator(".v1-section-product")).toBeVisible();
    await expect(page.locator(".v1-section-problem")).toBeVisible();
    await expect(page.locator(".v1-section-avantages")).toBeVisible();
    await expect(page.locator(".v1-section-social")).toBeVisible();
    await expect(page.locator(".v1-section-offre")).toBeVisible();
    await expect(page.locator(".v1-section-objections")).toBeVisible();
    await expect(page.locator("#contact")).toBeVisible();
    await expect(page.locator("#contact .v1-contact-button-primary")).toHaveText("Contacter sur WhatsApp");
    await expect(page.locator("#contact .v1-contact-meta")).toContainText("+262 693 10 39 08");
    await expect(page.locator("#contact .v1-contact-link")).toHaveCount(2);
    await expect(page.locator('#contact .v1-contact-link[href^="mailto:"]')).toHaveText("Envoyer un email");
    await expect(page.locator('#contact .v1-contact-link[href*="instagram.com"]')).toHaveText("Voir Instagram");
    await expect(page.locator("#contact .v1-contact-fallback")).toContainText("contact@givre-reyone.re");
    await expect(page.locator("#contact")).not.toContainText("Contacter sur WhatsApp (+262 693 10 39 08)");
    await expect(page.locator("#contact")).not.toContainText("Envoyer un email (contact@givre-reyone.re)");
    await expect(page.locator(".v1-hero picture img#ibh3cx")).toBeVisible();
    await expect(page.locator(".v1-hero picture img#ibh3cx")).toHaveAttribute("src", "/hero-lcp-800.webp");
    await expect(page.locator('a[href="#contact"]')).toHaveCount(5);
    await expect(page.locator("footer .v1-legal-links")).toBeVisible();
    await expect(page.locator('footer .v1-legal-links a[href="/mentions-legales.html"]')).toBeVisible();
    await expect(page.locator('footer .v1-legal-links a[href="/politique-confidentialite.html"]')).toBeVisible();
    await expect(page.locator('footer .v1-legal-links a[href="/politique-cookies.html"]')).toBeVisible();
    await expect(page.locator('footer .v1-legal-links a[href="/cgu-cgv.html"]')).toBeVisible();

    await page.click('a[href="#contact"]');
    await expect(page.locator("#contact")).toBeInViewport();
  });

  test("home avoids remote hero blob and runtime page-content requests", async ({ page }) => {
    const requests: string[] = [];
    page.on("request", (request) => {
      requests.push(request.url());
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    expect(requests.some((url) => url.includes("/api/page-content"))).toBeFalsy();
    expect(requests.some((url) => url.includes("public.blob.vercel-storage.com"))).toBeFalsy();
  });

  test("header background spans full viewport width", async ({ page }) => {
    await page.goto("/");

    const headerMetrics = await page.locator(".v1-header").evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      const layoutWidth = document.documentElement.clientWidth;
      return {
        left: rect.left,
        rightGap: layoutWidth - rect.right,
        backgroundColor: style.backgroundColor
      };
    });

    expect(Math.abs(headerMetrics.left)).toBeLessThan(1);
    expect(Math.abs(headerMetrics.rightGap)).toBeLessThan(20);
    expect(headerMetrics.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
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
      await expect(page.locator("main.legal-main")).toBeVisible();
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("body")).not.toContainText("À compléter");
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
