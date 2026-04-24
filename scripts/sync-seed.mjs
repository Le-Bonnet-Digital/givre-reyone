/**
 * Fetches the currently published builder content from Vercel KV and overwrites
 * src/templates/version-1-published-seed.js with it. Run this locally after a
 * builder publish session to keep the git-committed seed in sync.
 *
 * Usage:
 *   vercel env pull .env.local   # pull KV credentials if not already done
 *   npm run sync-seed
 */

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const seedPath = join(root, "src", "templates", "version-1-published-seed.js");

if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
  console.error("Missing KV credentials. Run `vercel env pull .env.local` then `npm run sync-seed`.");
  process.exit(1);
}

const { kv } = await import("@vercel/kv");
const index = await kv.get("builder:version-1");
const url = index?.published?.url;

if (!url) {
  console.error("No published document found in KV for version-1.");
  process.exit(1);
}

const res = await fetch(url, { cache: "no-store" });
if (!res.ok) {
  console.error(`Failed to fetch published document from blob: ${res.status} ${res.statusText}`);
  process.exit(1);
}

const doc = await res.json();

const content = `export default JSON.parse(String.raw\`${JSON.stringify(doc)}\`);\n`;
await writeFile(seedPath, content, "utf8");

console.log("Synced published KV content to", seedPath);
console.log("  publishedAt:", doc.publishedAt ?? "(unknown)");
console.log("  updatedAt  :", doc.updatedAt ?? "(unknown)");
console.log("\nCommit the updated seed file to persist this snapshot in git.");
