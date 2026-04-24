import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const SOURCE_URL =
  "https://x1ayqv7wwavw0m6h.public.blob.vercel-storage.com/builder-assets/1776942961900-Logo_fond_transparent.png";

const outDir = join(root, "public");
const out800 = join(outDir, "hero-lcp-800.webp");
const out400 = join(outDir, "hero-lcp-400.webp");

const res = await fetch(SOURCE_URL);
if (!res.ok) {
  throw new Error(`Failed to download hero PNG: ${res.status}`);
}

const buf = Buffer.from(await res.arrayBuffer());
await mkdir(outDir, { recursive: true });

const webp = { quality: 86 };
await sharp(buf)
  .resize(800, 800, { fit: "inside", withoutEnlargement: true })
  .webp(webp)
  .toFile(out800);
await sharp(buf)
  .resize(400, 400, { fit: "inside", withoutEnlargement: true })
  .webp(webp)
  .toFile(out400);

console.log("Wrote", out800, out400, `from ${(buf.length / 1024 / 1024).toFixed(2)} MB PNG`);
