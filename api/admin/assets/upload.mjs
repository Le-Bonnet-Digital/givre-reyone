import { put } from "@vercel/blob";
import { isAdminTokenValid } from "../../_lib/auth.mjs";
import { readBuffer } from "../../_lib/body.mjs";
import { blobEnabled } from "../../_lib/store.mjs";

function safeName(input) {
  const base = String(input || "upload")
    .replaceAll("\\", "/")
    .split("/")
    .pop()
    .trim();
  return base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "upload";
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  if (!isAdminTokenValid(req)) {
    res.statusCode = 401;
    res.end(JSON.stringify({ ok: false }));
    return;
  }

  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: "method_not_allowed" }));
    return;
  }

  if (!blobEnabled()) {
    res.statusCode = 503;
    res.end(JSON.stringify({ ok: false, error: "blob_not_configured" }));
    return;
  }

  const url = new URL(req.url, "http://localhost");
  const filename = safeName(url.searchParams.get("filename"));
  const contentType = req.headers["content-type"] || "application/octet-stream";

  let data = null;
  try {
    data = await readBuffer(req, { maxBytes: 8 * 1024 * 1024 });
  } catch (error) {
    res.statusCode = error?.message === "payload_too_large" ? 413 : 400;
    res.end(JSON.stringify({ ok: false, error: error?.message || "invalid_body" }));
    return;
  }

  try {
    const pathname = `builder-assets/${Date.now()}-${filename}`;
    const result = await put(pathname, data, {
      access: "public",
      contentType
    });
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, url: result.url, pathname: result.pathname }));
  } catch {
    res.statusCode = 500;
    res.end(JSON.stringify({ ok: false, error: "upload_failed" }));
  }
}
