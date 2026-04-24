import { isAdminTokenValid } from "../../_lib/auth.mjs";
import { readJson } from "../../_lib/body.mjs";
import { isAllowedPage, isValidBuilderDocument } from "../../_lib/store.mjs";
import { getPageFromGit, commitPageToGit } from "../../_lib/git-store.mjs";

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
  const expectedSha = body?.sha || null;

  if (!isAllowedPage(page) || !isValidBuilderDocument(document)) {
    res.statusCode = 400;
    res.end(JSON.stringify({ ok: false, error: "invalid_payload" }));
    return;
  }

  try {
    // Add metadata
    document.publishedAt = new Date().toISOString();

    // Commit to Git with conflict detection
    const result = await commitPageToGit(
      page,
      document,
      expectedSha,
      `[Builder] Publish page: ${page}\n\nPublished by admin via builder interface.\nTimestamp: ${document.publishedAt}`
    );

    res.statusCode = 200;
    res.end(
      JSON.stringify({
        ok: true,
        page,
        sha: result.sha,
        url: result.url,
        publishedAt: document.publishedAt
      })
    );
  } catch (error) {
    if (error.code === "conflict" || error.status === 409) {
      res.statusCode = 409;
      res.end(
        JSON.stringify({
          ok: false,
          error: "conflict",
          message: "This page was modified elsewhere. Please reload and try again.",
          detail: "concurrent_modification"
        })
      );
    } else {
      res.statusCode = 500;
      res.end(JSON.stringify({ ok: false, error: error?.code || "server_error" }));
    }
  }
}
