import { put } from "@vercel/blob";
import { kv } from "@vercel/kv";

export const PAGE_IDS = [
  "version-1",
  "mentions-legales",
  "politique-confidentialite",
  "politique-cookies",
  "cgu-cgv"
];

function builderKey(page) {
  return `builder:${page}`;
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeHtml(html) {
  if (typeof html !== "string") {
    return "";
  }

  const trimmed = html.trim();
  const bodyMatch = trimmed.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return (bodyMatch ? bodyMatch[1] : trimmed).trim();
}

function normalizeProjectData(projectData) {
  return isObject(projectData) ? projectData : null;
}

function normalizeDocument(document, { updatedAt, publishedAt } = {}) {
  if (!isObject(document)) {
    return null;
  }

  return {
    html: normalizeHtml(document.html),
    css: typeof document.css === "string" ? document.css : "",
    projectData: normalizeProjectData(document.projectData),
    updatedAt: updatedAt || document.updatedAt || new Date().toISOString(),
    publishedAt: publishedAt || document.publishedAt || null
  };
}

function normalizePointer(pointer) {
  if (!isObject(pointer)) {
    return null;
  }

  if (typeof pointer.url !== "string" || !pointer.url) {
    return null;
  }

  return {
    url: pointer.url,
    pathname: typeof pointer.pathname === "string" ? pointer.pathname : "",
    updatedAt: typeof pointer.updatedAt === "string" ? pointer.updatedAt : null,
    publishedAt: typeof pointer.publishedAt === "string" ? pointer.publishedAt : null
  };
}

async function fetchDocument(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("document_fetch_failed");
  }
  return response.json();
}

export function isAllowedPage(page) {
  return PAGE_IDS.includes(page);
}

export function kvEnabled() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

export function blobEnabled() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function isValidBuilderDocument(document) {
  if (!isObject(document)) {
    return false;
  }

  if (typeof document.html !== "string") {
    return false;
  }

  if ("css" in document && typeof document.css !== "string") {
    return false;
  }

  if ("projectData" in document && document.projectData !== null && !isObject(document.projectData)) {
    return false;
  }

  return true;
}

export async function getPageIndex(page) {
  if (!isAllowedPage(page) || !kvEnabled()) {
    return { draft: null, published: null };
  }

  const stored = await kv.get(builderKey(page));
  return {
    draft: normalizePointer(stored?.draft),
    published: normalizePointer(stored?.published)
  };
}

export async function getPageDocument(page, mode = "draft") {
  if (!isAllowedPage(page)) {
    return { source: "template", document: null, index: { draft: null, published: null } };
  }

  const index = await getPageIndex(page);
  const primary = mode === "published" ? index.published : index.draft || index.published;
  const source = mode === "published" ? (index.published ? "published" : "template") : (index.draft ? "draft" : index.published ? "published" : "template");

  if (!primary) {
    return { source, document: null, index };
  }

  try {
    const document = normalizeDocument(await fetchDocument(primary.url), {
      updatedAt: primary.updatedAt,
      publishedAt: primary.publishedAt
    });
    return { source, document, index };
  } catch {
    return { source: "template", document: null, index };
  }
}

async function writeDocumentBlob(page, kind, document) {
  if (!blobEnabled()) {
    const err = new Error("blob_not_configured");
    err.code = "blob_not_configured";
    throw err;
  }

  const normalized = normalizeDocument(document);
  if (!normalized) {
    const err = new Error("invalid_document");
    err.code = "invalid_document";
    throw err;
  }

  const updatedAt = new Date().toISOString();
  normalized.updatedAt = updatedAt;
  const pathname = `builder/${page}/${kind}-${Date.now()}.json`;
  const result = await put(pathname, JSON.stringify(normalized, null, 2), {
    access: "public",
    contentType: "application/json; charset=utf-8"
  });

  return {
    pointer: {
      url: result.url,
      pathname: result.pathname,
      updatedAt,
      publishedAt: kind === "published" ? updatedAt : null
    },
    document: normalized
  };
}

export async function saveDraftDocument(page, document) {
  if (!isAllowedPage(page) || !kvEnabled()) {
    const err = new Error("kv_not_configured");
    err.code = "kv_not_configured";
    throw err;
  }

  const index = await getPageIndex(page);
  const { pointer, document: normalized } = await writeDocumentBlob(page, "draft", document);
  const nextIndex = { ...index, draft: pointer };
  await kv.set(builderKey(page), nextIndex);

  return {
    document: normalized,
    draft: pointer,
    published: nextIndex.published
  };
}

export async function publishDraftDocument(page) {
  if (!isAllowedPage(page) || !kvEnabled()) {
    const err = new Error("kv_not_configured");
    err.code = "kv_not_configured";
    throw err;
  }

  const index = await getPageIndex(page);
  if (!index.draft) {
    const err = new Error("draft_not_found");
    err.code = "draft_not_found";
    throw err;
  }

  const publishedAt = new Date().toISOString();
  const nextPublished = {
    ...index.draft,
    publishedAt
  };

  await kv.set(builderKey(page), {
    ...index,
    published: nextPublished
  });

  return nextPublished;
}

export async function resetDraftDocument(page) {
  if (!isAllowedPage(page) || !kvEnabled()) {
    const err = new Error("kv_not_configured");
    err.code = "kv_not_configured";
    throw err;
  }

  const index = await getPageIndex(page);
  await kv.set(builderKey(page), {
    ...index,
    draft: null
  });

  return {
    draft: null,
    published: index.published
  };
}
