import { Page, test } from "@playwright/test";

const ADMIN_TOKEN_ENV_KEYS = ["E2E_ADMIN_TOKEN", "ADMIN_TOKEN"];

export function getAdminToken() {
  for (const key of ADMIN_TOKEN_ENV_KEYS) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

export function skipIfNoAdminToken() {
  test.skip(!getAdminToken(), "ADMIN_TOKEN/E2E_ADMIN_TOKEN is required for authenticated builder tests.");
}

export async function authenticateBuilderSession(page: Page) {
  const token = getAdminToken();
  if (!token) {
    throw new Error("Missing ADMIN_TOKEN/E2E_ADMIN_TOKEN for builder auth.");
  }

  await page.addInitScript((value) => {
    window.localStorage.setItem("gr_admin_token", value);
  }, token);
}
