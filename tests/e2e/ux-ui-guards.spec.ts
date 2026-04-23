import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

function isIgnorableConsoleMessage(text: string) {
  return text.includes("favicon.ico");
}

test.describe("UX/UI guards", () => {
  test("no critical console errors on home", async ({ page }) => {
    const criticalErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && !isIgnorableConsoleMessage(msg.text())) {
        criticalErrors.push(msg.text());
      }
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(criticalErrors, `Console errors found:\n${criticalErrors.join("\n")}`).toEqual([]);
  });

  test("internal links from home are reachable", async ({ page, request }) => {
    await page.goto("/");
    const hrefs = await page
      .locator("a[href]")
      .evaluateAll((anchors) =>
        anchors
          .map((a) => a.getAttribute("href") || "")
          .filter((href) => href.startsWith("/") && !href.startsWith("//"))
      );

    const unique = [...new Set(hrefs)];
    for (const href of unique) {
      const response = await request.get(href);
      expect(response.status(), `Broken link: ${href}`).toBeLessThan(400);
    }
  });

  test("basic accessibility checks for home and admin", async ({ page }) => {
    for (const route of ["/", "/admin.html"]) {
      await page.goto(route);
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      const criticalViolations = accessibilityScanResults.violations.filter(
        (violation) => violation.impact === "critical"
      );
      expect(
        criticalViolations,
        `${route} has critical accessibility violations:\n${criticalViolations
          .map((v) => `${v.id}: ${v.help}`)
          .join("\n")}`
      ).toEqual([]);
    }
  });
});
