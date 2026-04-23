import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

function ensureArtifactsDir() {
  const dir = path.resolve(process.cwd(), "test-results", "screenshots");
  mkdirSync(dir, { recursive: true });
  return dir;
}

test.describe("Screenshot capture", () => {
  test("capture key pages", async ({ page, browserName }, testInfo) => {
    const targetDir = ensureArtifactsDir();
    const suffix = `${browserName}-${testInfo.project.name}`;
    const captures = [
      { route: "/", name: `home-${suffix}.png` },
      { route: "/mentions-legales.html", name: `mentions-legales-${suffix}.png` },
      { route: "/politique-confidentialite.html", name: `politique-confidentialite-${suffix}.png` },
      { route: "/politique-cookies.html", name: `politique-cookies-${suffix}.png` },
      { route: "/cgu-cgv.html", name: `cgu-cgv-${suffix}.png` },
      { route: "/admin.html", name: `admin-login-${suffix}.png` }
    ];

    for (const capture of captures) {
      const response = await page.goto(capture.route, { waitUntil: "networkidle" });
      expect(response?.ok(), `failed to load ${capture.route}`).toBeTruthy();

      const filePath = path.join(targetDir, capture.name);
      await page.screenshot({ path: filePath, fullPage: true });
      await testInfo.attach(capture.name, { path: filePath, contentType: "image/png" });
    }
  });
});
