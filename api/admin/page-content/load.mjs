import { isAdminTokenValid } from "../../_lib/auth.mjs";
import { isAllowedPage } from "../../_lib/store.mjs";
import { getPageFromGit } from "../../_lib/git-store.mjs";

/**
 * Load page with current SHA for builder
 * Builder uses this SHA when publishing to detect concurrent modifications
 */
export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  if (!isAdminTokenValid(req)) {
    res.statusCode = 401;
    res.end(JSON.stringify({ ok: false }));
    return;
  }

  if (req.method !== "GET" && req.method !== "POST") {
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: "method_not_allowed" }));
    return;
  }

  const page = req.method === "GET" ? req.query.page : req.body?.page;

  if (!page || !isAllowedPage(page)) {
    res.statusCode = 400;
    res.end(JSON.stringify({ ok: false, error: "invalid_page" }));
    return;
  }

  try {
    const { document, sha } = await getPageFromGit(page);

    if (!document) {
      res.statusCode = 404;
      res.end(JSON.stringify({ ok: false, error: "page_not_found" }));
      return;
    }

    res.statusCode = 200;
    res.end(
      JSON.stringify({
        ok: true,
        page,
        document,
        sha,
        loadedAt: new Date().toISOString()
      })
    );
  } catch (error) {
    console.error(`[admin/page-content/load] Error for page ${page}:`, error);
    res.statusCode = 500;
    res.end(JSON.stringify({ ok: false, error: error?.code || "server_error" }));
  }
}
