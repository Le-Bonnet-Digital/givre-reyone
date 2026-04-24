import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

async function fetchPublishedFromKv() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return null;
  const { kv } = await import("@vercel/kv");
  const index = await kv.get("builder:version-1");
  const url = index?.published?.url;
  if (!url) return null;
  const res = await fetch(url, { cache: "no-store" });
  return res.ok ? res.json() : null;
}

let doc = null;
try {
  doc = await fetchPublishedFromKv();
  if (doc) console.log("emit-v1-above-fold: using published content from Vercel KV");
} catch (e) {
  console.warn("emit-v1-above-fold: KV fetch failed, falling back to seed file:", e.message);
}

if (!doc) {
  const { getVersion1InitialDocument } = await import("../src/templates/version-1-document.js");
  doc = getVersion1InitialDocument();
  console.log("emit-v1-above-fold: using local seed file");
}

const fullHtml = typeof doc?.html === "string" ? doc.html : "";

const headerMatch = fullHtml.match(/<header class="v1-header"[^>]*>[\s\S]*?<\/header>/i);
if (!headerMatch) {
  throw new Error('emit-v1-above-fold: could not find <header class="v1-header"> in prepared version-1 document');
}

const heroMatch = fullHtml.match(/<section class="v1-hero"[^>]*>[\s\S]*?<\/section>/i);
if (!heroMatch) {
  throw new Error('emit-v1-above-fold: could not find <section class="v1-hero"> in prepared version-1 document');
}

const headerHtml = headerMatch[0].replace(
  /^<header class="v1-header"/,
  '<header class="v1-header" id="v1-header-prerender" data-v1-header="prerender"'
);

const heroHtml = heroMatch[0].replace(
  /^<section class="v1-hero"/,
  '<section class="v1-hero" id="v1-hero-prerender" data-v1-hero="prerender"'
);

/** Hero must live inside <main> so first paint matches published DOM (#page-root > header + main > .v1-hero) and builder CSS applies before hydration. */
const combined = `${headerHtml}\n<main id="v1-main-prerender-shell">\n${heroHtml}\n</main>`;

const seedCss = typeof doc?.css === "string" ? doc.css : "";

const outDir = join(root, "src", "fragments");
const outFile = join(outDir, "v1-above-fold-prerender.html");
const cssFile = join(outDir, "v1-seed-custom.css");
await mkdir(outDir, { recursive: true });
await writeFile(outFile, combined, "utf8");
await writeFile(cssFile, seedCss, "utf8");
console.log("Wrote", outFile, `(${combined.length} bytes)`);
console.log("Wrote", cssFile, `(${seedCss.length} bytes)`);
