import { isAdminTokenValid } from "../../_lib/auth.mjs";
import { readJson } from "../../_lib/body.mjs";
import { blobEnabled, isAllowedPage, isValidBuilderDocument, kvEnabled, saveDraftDocument } from "../../_lib/store.mjs";

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

  if (!kvEnabled()) {
    res.statusCode = 503;
    res.end(JSON.stringify({ ok: false, error: "kv_not_configured", kvEnabled: false, blobEnabled: blobEnabled() }));
    return;
  }

  let body = null;
  try {
    body = await readJson(req);
  } catch {
    res.statusCode = 400;
    res.end(JSON.stringify({ ok: false, error: "invalid_json" }));
    return;
  }

  const page = body?.page || "";
  const document = body?.document || null;

  if (!isAllowedPage(page) || !isValidBuilderDocument(document)) {
    res.statusCode = 400;
    res.end(JSON.stringify({ ok: false, error: "invalid_payload" }));
    return;
  }

  try {
    const result = await saveDraftDocument(page, document);
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, page, document: result.document, draft: result.draft, published: result.published }));
  } catch (error) {
    res.statusCode = error?.code === "blob_not_configured" ? 503 : 500;
    res.end(JSON.stringify({ ok: false, error: error?.code || "server_error" }));
  }
}
