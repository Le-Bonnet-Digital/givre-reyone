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

async function getVercelKvClient() {
  const mod = await import("@vercel/kv");
  return mod.kv;
}

async function putVercelBlob(pathname, data, options) {
  const mod = await import("@vercel/blob");
  return mod.put(pathname, data, options);
}

async function kvGet(key, runtimeEnv) {
  if (runtimeEnv?.BUILDER_KV?.get) {
    return runtimeEnv.BUILDER_KV.get(key, { type: "json" });
  }
  const client = await getVercelKvClient();
  return client.get(key);
}

async function kvSet(key, value, runtimeEnv) {
  if (runtimeEnv?.BUILDER_KV?.put) {
    await runtimeEnv.BUILDER_KV.put(key, JSON.stringify(value));
    return;
  }
  const client = await getVercelKvClient();
  await client.set(key, value);
}

async function readBlobDocument(pointer, runtimeEnv) {
  if (!pointer?.url) {
    return null;
  }

  if (pointer.url.startsWith("r2://")) {
    const key = pointer.url.slice("r2://".length);
    const object = await runtimeEnv?.BUILDER_R2?.get?.(key);
    if (!object) {
      throw new Error("document_fetch_failed");
    }
    const rawText = await object.text();
    return JSON.parse(rawText);
  }

  const response = await fetch(pointer.url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("document_fetch_failed");
  }
  return response.json();
}

function buildR2PublicUrl(runtimeEnv, key) {
  const base = runtimeEnv?.R2_PUBLIC_BASE_URL || runtimeEnv?.PUBLIC_ASSET_BASE_URL || "";
  if (!base) {
    return null;
  }
  return `${base.replace(/\/$/, "")}/${key}`;
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

export function isAllowedPage(page) {
  return PAGE_IDS.includes(page);
}

export function kvEnabled(runtimeEnv) {
  if (runtimeEnv?.BUILDER_KV) {
    return true;
  }
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

export function blobEnabled(runtimeEnv) {
  if (runtimeEnv?.BUILDER_R2) {
    return true;
  }
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

export async function getPageIndex(page, runtimeEnv) {
  if (!isAllowedPage(page) || !kvEnabled(runtimeEnv)) {
    return { draft: null, published: null };
  }

  const stored = await kvGet(builderKey(page), runtimeEnv);
  return {
    draft: normalizePointer(stored?.draft),
    published: normalizePointer(stored?.published)
  };
}

export async function getPageDocument(page, mode = "draft", runtimeEnv) {
  if (!isAllowedPage(page)) {
    return { source: "template", document: null, index: { draft: null, published: null } };
  }

  const index = await getPageIndex(page, runtimeEnv);
  const primary = mode === "published" ? index.published : index.draft || index.published;
  const source = mode === "published" ? (index.published ? "published" : "template") : (index.draft ? "draft" : index.published ? "published" : "template");

  if (!primary) {
    return { source, document: null, index };
  }

  try {
    const document = normalizeDocument(await readBlobDocument(primary, runtimeEnv), {
      updatedAt: primary.updatedAt,
      publishedAt: primary.publishedAt
    });
    return { source, document, index };
  } catch {
    return { source: "template", document: null, index };
  }
}

async function writeDocumentBlob(page, kind, document, runtimeEnv) {
  if (!blobEnabled(runtimeEnv)) {
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
  let pointerUrl = "";
  let pointerPathname = pathname;

  if (runtimeEnv?.BUILDER_R2?.put) {
    await runtimeEnv.BUILDER_R2.put(pathname, JSON.stringify(normalized, null, 2), {
      httpMetadata: {
        contentType: "application/json; charset=utf-8"
      }
    });
    pointerUrl = `r2://${pathname}`;
  } else {
    const result = await putVercelBlob(pathname, JSON.stringify(normalized, null, 2), {
      access: "public",
      contentType: "application/json; charset=utf-8"
    });
    pointerUrl = result.url;
    pointerPathname = result.pathname;
  }

  return {
    pointer: {
      url: pointerUrl,
      pathname: pointerPathname,
      updatedAt,
      publishedAt: kind === "published" ? updatedAt : null
    },
    document: normalized
  };
}

export async function saveDraftDocument(page, document, runtimeEnv) {
  if (!isAllowedPage(page) || !kvEnabled(runtimeEnv)) {
    const err = new Error("kv_not_configured");
    err.code = "kv_not_configured";
    throw err;
  }

  const index = await getPageIndex(page, runtimeEnv);
  const { pointer, document: normalized } = await writeDocumentBlob(page, "draft", document, runtimeEnv);
  const nextIndex = { ...index, draft: pointer };
  await kvSet(builderKey(page), nextIndex, runtimeEnv);

  return {
    document: normalized,
    draft: pointer,
    published: nextIndex.published
  };
}

export async function publishDraftDocument(page, runtimeEnv) {
  if (!isAllowedPage(page) || !kvEnabled(runtimeEnv)) {
    const err = new Error("kv_not_configured");
    err.code = "kv_not_configured";
    throw err;
  }

  const index = await getPageIndex(page, runtimeEnv);
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

  await kvSet(builderKey(page), {
    ...index,
    published: nextPublished
  }, runtimeEnv);

  return nextPublished;
}

export async function resetDraftDocument(page, runtimeEnv) {
  if (!isAllowedPage(page) || !kvEnabled(runtimeEnv)) {
    const err = new Error("kv_not_configured");
    err.code = "kv_not_configured";
    throw err;
  }

  const index = await getPageIndex(page, runtimeEnv);
  await kvSet(builderKey(page), {
    ...index,
    draft: null
  }, runtimeEnv);

  return {
    draft: null,
    published: index.published
  };
}

export async function uploadBuilderAsset(filename, data, contentType, runtimeEnv) {
  const pathname = `builder-assets/${Date.now()}-${filename}`;
  if (runtimeEnv?.BUILDER_R2?.put) {
    await runtimeEnv.BUILDER_R2.put(pathname, data, {
      httpMetadata: { contentType }
    });
    return {
      pathname,
      url: buildR2PublicUrl(runtimeEnv, pathname) || `r2://${pathname}`
    };
  }

  const result = await putVercelBlob(pathname, data, {
    access: "public",
    contentType
  });
  return {
    pathname: result.pathname,
    url: result.url
  };
}
