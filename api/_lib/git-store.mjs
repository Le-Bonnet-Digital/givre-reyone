/**
 * Git store using GitHub REST API
 * - Reads content from GitHub
 * - Writes commits with conflict detection (409 if SHA mismatch)
 */

const GITHUB_API = "https://api.github.com";
const GITHUB_OWNER = process.env.GITHUB_OWNER || "Le-Bonnet-Digital";
const GITHUB_REPO = process.env.GITHUB_REPO || "givre-reyone";
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";

function getAuthHeader() {
  if (!GITHUB_TOKEN) {
    return {};
  }
  return { Authorization: `Bearer ${GITHUB_TOKEN}` };
}

async function githubFetch(path, options = {}) {
  const url = `${GITHUB_API}${path}`;
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...getAuthHeader(),
    ...options.headers
  };

  const response = await fetch(url, {
    ...options,
    headers,
    cache: "no-store"
  });

  if (!response.ok) {
    const text = await response.text();
    const err = new Error(`GitHub API error: ${response.status}`);
    err.code = response.status === 404 ? "not_found" : "api_error";
    err.status = response.status;
    err.body = text;
    throw err;
  }

  return response.json();
}

/**
 * Get file content from GitHub
 * @returns {{ content: string, sha: string }}
 */
export async function getPageFromGit(page) {
  if (!GITHUB_TOKEN) {
    throw new Error("GITHUB_TOKEN not configured");
  }

  try {
    const response = await githubFetch(
      `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/src/data/pages/${page}.json?ref=${GITHUB_BRANCH}`
    );

    const content = Buffer.from(response.content, "base64").toString("utf-8");
    return {
      document: JSON.parse(content),
      sha: response.sha,
      path: response.path
    };
  } catch (error) {
    if (error.code === "not_found") {
      return { document: null, sha: null, path: null };
    }
    throw error;
  }
}

/**
 * Commit file to GitHub with SHA verification (409 Conflict if mismatch)
 * @param page - page ID
 * @param document - document object
 * @param currentSha - SHA to verify against (409 if mismatch)
 * @param message - commit message
 * @returns {{ sha: string, committed: boolean }}
 */
export async function commitPageToGit(page, document, currentSha, message) {
  if (!GITHUB_TOKEN) {
    throw new Error("GITHUB_TOKEN not configured");
  }

  try {
    // Get current SHA from GitHub
    const current = await getPageFromGit(page);

    // Verify no concurrent modification
    if (current.sha && current.sha !== currentSha) {
      const err = new Error("Concurrent modification detected");
      err.code = "conflict";
      err.status = 409;
      throw err;
    }

    // Prepare payload
    const fileContent = Buffer.from(JSON.stringify(document, null, 2)).toString("base64");
    const sha = current?.sha;

    const payload = {
      message,
      content: fileContent,
      branch: GITHUB_BRANCH,
      ...(sha && { sha })
    };

    // Commit
    const response = await githubFetch(
      `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/src/data/pages/${page}.json`,
      {
        method: "PUT",
        body: JSON.stringify(payload)
      }
    );

    return {
      sha: response.commit.sha,
      committed: true,
      url: response.commit.html_url
    };
  } catch (error) {
    if (error.status === 409) {
      // This is actually GitHub API merge conflict, we transform it
      error.code = "conflict";
      error.status = 409;
    }
    throw error;
  }
}

export { GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH };
