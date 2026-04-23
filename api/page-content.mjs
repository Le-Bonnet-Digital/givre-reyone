import { getPageDocument, isAllowedPage, kvEnabled, blobEnabled } from "./_lib/store.mjs";

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  try {
    const url = new URL(req.url, "http://localhost");
    const page = url.searchParams.get("page") || "";
    const mode = url.searchParams.get("mode") === "published" ? "published" : "draft";

    if (!isAllowedPage(page)) {
      res.statusCode = 400;
      res.end(JSON.stringify({ ok: false, error: "invalid_page" }));
      return;
    }

    const result = await getPageDocument(page, mode);
    res.statusCode = 200;
    res.end(
      JSON.stringify({
        ok: true,
        page,
        mode,
        source: result.source,
        document: result.document,
        draft: result.index?.draft || null,
        published: result.index?.published || null,
        kvEnabled: kvEnabled(),
        blobEnabled: blobEnabled()
      })
    );
  } catch {
    res.statusCode = 500;
    res.end(JSON.stringify({ ok: false, error: "server_error" }));
  }
}
