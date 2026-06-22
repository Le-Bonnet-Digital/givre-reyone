import { defineConfig } from "@playwright/test";

/**
 * Suite E2E dediee au runtime Cloudflare Worker (worker.mjs).
 *
 * Objectif : prouver que le Worker sert l'admin/builder de facon equivalente
 * au backend actuel, en exercant les routes API declarees dans worker.mjs
 * contre un `wrangler dev` local (bindings preview BUILDER_KV / BUILDER_R2
 * simules localement par Miniflare, sans secret ni acces production).
 *
 * Cette config est volontairement separee de `playwright.config.ts` (runtime
 * Vercel) : testDir distinct, port distinct, demarrage de `wrangler dev` au
 * lieu de `vercel dev`. Les specs Vercel existantes ne sont pas affectees.
 *
 * Variables d'environnement :
 * - E2E_ADMIN_TOKEN / ADMIN_TOKEN : token admin injecte dans le Worker
 *   (defaut deterministe ci-dessous si absent).
 * - GITHUB_TOKEN : optionnel ; si present, transmis au Worker pour exercer
 *   le round-trip Git complet (load/publish). Sinon ces routes ne sont
 *   verifiees que sur leurs contrats d'auth/validation (deterministes).
 * - E2E_SKIP_CLOUDFLARE=1 : ne demarre pas wrangler dev et fait skipper la
 *   suite (utile quand l'environnement empeche d'executer wrangler localement).
 */

const PORT = Number(process.env.E2E_CLOUDFLARE_PORT || 8788);
const BASE_URL = `http://127.0.0.1:${PORT}`;

const ADMIN_TOKEN = (
  process.env.E2E_ADMIN_TOKEN ||
  process.env.ADMIN_TOKEN ||
  "e2e-cloudflare-admin-token"
).trim();

// Aligne le token lu par les specs (helpers/auth -> E2E_ADMIN_TOKEN/ADMIN_TOKEN)
// avec celui injecte dans le Worker via `--var`.
process.env.E2E_ADMIN_TOKEN = ADMIN_TOKEN;

const skip = process.env.E2E_SKIP_CLOUDFLARE === "1";

const wranglerVars = [`--var ADMIN_TOKEN:${ADMIN_TOKEN}`];
if (process.env.GITHUB_TOKEN) {
  wranglerVars.push(`--var GITHUB_TOKEN:${process.env.GITHUB_TOKEN}`);
}

export default defineConfig({
  testDir: "./tests/e2e-cloudflare",
  timeout: 60000,
  expect: {
    timeout: 10000
  },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry"
  },
  webServer: skip
    ? undefined
    : {
        command: `npx wrangler dev --port ${PORT} --ip 127.0.0.1 ${wranglerVars.join(" ")}`,
        url: `${BASE_URL}/api/admin/ping`,
        timeout: 120000,
        reuseExistingServer: true
      },
  projects: [
    {
      name: "cloudflare-worker-api"
    }
  ]
});
