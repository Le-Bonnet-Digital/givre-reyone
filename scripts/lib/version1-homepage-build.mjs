import sharp from "sharp";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

import { prepareVersion1Document } from "../../src/templates/version-1-document.js";

export const HERO_ASSET_SPECS = [
  { width: 400, fileName: "hero-lcp-400.webp" },
  { width: 800, fileName: "hero-lcp-800.webp" }
];

export const HOMEPAGE_FRAGMENT_FILE = "v1-homepage-published.html";
export const HOMEPAGE_CUSTOM_CSS_FILE = "v1-seed-custom.css";
const GENERATED_HOMEPAGE_BANNER =
  "<!-- GENERATED FILE: derived from src/data/pages/version-1.json via scripts/emit-v1-hero-fragment.mjs. Do not edit manually. -->\n";

export function getRepoRoot(importMetaUrl) {
  const currentDir = dirname(fileURLToPath(importMetaUrl));
  const up = /[\\/]lib$/i.test(currentDir) ? ["..", ".."] : [".."];
  return resolve(currentDir, ...up);
}

export async function readPublishedHomepageSource(root) {
  const sourcePath = join(root, "src", "data", "pages", "version-1.json");
  const raw = JSON.parse(await readFile(sourcePath, "utf8"));

  if (typeof raw?.html !== "string" || !raw.html.trim()) {
    throw new Error("homepage_published_document_missing_html");
  }

  return raw;
}

export function extractHeroSourceFromHtml(html) {
  if (typeof html !== "string" || !html) {
    throw new Error("hero_source_missing_html");
  }

  const pictureMatch = html.match(
    /<picture\b[^>]*class="v1-hero-picture"[^>]*>[\s\S]*?<img\b(?=[^>]*\bid\s*=\s*"ibh3cx")(?=[^>]*\bsrc\s*=\s*"([^"]+)")[^>]*(?:\/>|>)[\s\S]*?<\/picture>/i
  );
  if (pictureMatch?.[1]) {
    return pictureMatch[1];
  }

  const imgMatch = html.match(
    /<img\b(?=[^>]*\bid\s*=\s*"ibh3cx")(?=[^>]*\bsrc\s*=\s*"([^"]+)")[^>]*(?:\/>|>)/i
  );
  if (imgMatch?.[1]) {
    return imgMatch[1];
  }

  throw new Error("hero_source_not_found");
}

async function readSourceBuffer(root, source) {
  if (typeof source !== "string" || !source.trim()) {
    throw new Error("hero_source_invalid");
  }

  if (/^https?:\/\//i.test(source)) {
    const response = await fetch(source, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`hero_source_unreachable:${response.status}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  if (source.startsWith("data:")) {
    const base64Index = source.indexOf("base64,");
    if (base64Index === -1) {
      throw new Error("hero_source_data_uri_unsupported");
    }
    return Buffer.from(source.slice(base64Index + "base64,".length), "base64");
  }

  const localPath = source.startsWith("/")
    ? join(root, source.slice(1).replaceAll("/", "\\"))
    : resolve(root, source);

  return readFile(localPath);
}

export async function generateHeroAssets(root, documentSource) {
  const heroSource = extractHeroSourceFromHtml(documentSource?.html || "");
  const inputBuffer = await readSourceBuffer(root, heroSource);
  const metadata = await sharp(inputBuffer).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error("hero_source_not_an_image");
  }

  const outDir = join(root, "public");
  await mkdir(outDir, { recursive: true });

  const outputs = [];
  for (const spec of HERO_ASSET_SPECS) {
    const outputPath = join(outDir, spec.fileName);
    await sharp(inputBuffer)
      .rotate()
      .resize(spec.width, spec.width, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 84 })
      .toFile(outputPath);
    outputs.push(outputPath);
  }

  return {
    heroSource,
    outputs,
    metadata
  };
}

export async function buildPublishedHomepageArtifacts(root) {
  const documentSource = await readPublishedHomepageSource(root);
  const hero = await generateHeroAssets(root, documentSource);
  const prepared = prepareVersion1Document(documentSource);

  if (!prepared?.html || typeof prepared.html !== "string") {
    throw new Error("homepage_prepared_document_missing_html");
  }

  const fragmentsDir = join(root, "src", "fragments");
  await mkdir(fragmentsDir, { recursive: true });

  const fragmentPath = join(fragmentsDir, HOMEPAGE_FRAGMENT_FILE);
  const cssPath = join(fragmentsDir, HOMEPAGE_CUSTOM_CSS_FILE);
  await writeFile(fragmentPath, `${GENERATED_HOMEPAGE_BANNER}${prepared.html}`, "utf8");
  await writeFile(cssPath, typeof prepared.css === "string" ? prepared.css : "", "utf8");

  return {
    documentSource,
    prepared,
    hero,
    fragmentPath,
    cssPath
  };
}
