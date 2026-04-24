import { isAllowedPage } from "./_lib/store.mjs";
import { getPageFromGit, getPageFromLocalRepo } from "./_lib/git-store.mjs";

function shouldReadLocalWorkingTree() {
  return process.env.NODE_ENV !== "production";
}

async function loadPageDocument(page) {
  if (shouldReadLocalWorkingTree()) {
    const local = await getPageFromLocalRepo(page);
    if (local?.document) {
      return { ...local, source: "local-git" };
    }
  }

  const remote = await getPageFromGit(page);
  return { ...remote, source: "git" };
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  try {
    const url = new URL(req.url, "http://localhost");
    const page = url.searchParams.get("page") || "";
    const mode = url.searchParams.get("mode") === "published" ? "published" : "draft";

    if (!isAllowedPage(page)) {
      res.setHeader("Cache-Control", "no-store");
      res.statusCode = 400;
      res.end(JSON.stringify({ ok: false, error: "invalid_page" }));
      return;
    }

    // Load from Git (source of truth)
    const { document, sha, source } = await loadPageDocument(page);

    if (!document) {
      res.setHeader("Cache-Control", "no-store");
      res.statusCode = 404;
      res.end(JSON.stringify({ ok: false, error: "page_not_found" }));
      return;
    }

    res.statusCode = 200;
    if (mode === "published") {
      // Cache published content (Git is authoritative)
      res.setHeader(
        "Cache-Control",
        "public, max-age=60, s-maxage=120, stale-while-revalidate=86400"
      );
    } else {
      res.setHeader("Cache-Control", "no-store");
    }
    res.end(
      JSON.stringify({
        ok: true,
        page,
        mode,
        source,
        document,
        sha,
        loadedAt: new Date().toISOString()
      })
    );
  } catch (error) {
    res.setHeader("Cache-Control", "no-store");
    res.statusCode = 500;
    res.end(JSON.stringify({ ok: false, error: error?.code || "server_error" }));
  }
}
