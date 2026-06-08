import adminPing from "./api/admin/ping.mjs";
import pageContent from "./api/page-content.mjs";
import adminLoad from "./api/admin/page-content/load.mjs";
import adminSaveDraft from "./api/admin/page-content/save-draft.mjs";
import adminPublish from "./api/admin/page-content/publish.mjs";
import adminReset from "./api/admin/page-content/reset.mjs";
import adminAssetUpload from "./api/admin/assets/upload.mjs";
import contact from "./api/contact.mjs";

const ROUTES = new Map([
  ["/api/admin/ping", adminPing],
  ["/api/page-content", pageContent],
  ["/api/admin/page-content/load", adminLoad],
  ["/api/admin/page-content/save-draft", adminSaveDraft],
  ["/api/admin/page-content/publish", adminPublish],
  ["/api/admin/page-content/reset", adminReset],
  ["/api/admin/assets/upload", adminAssetUpload],
  ["/api/contact", contact]
]);

function parseAllowedOrigins(env) {
  const configured = String(env?.CORS_ALLOWED_ORIGINS || "").trim();
  if (!configured) {
    return [];
  }
  return configured
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function resolveOriginHeader(request, env) {
  const requestOrigin = request.headers.get("origin") || "";
  if (!requestOrigin) {
    return "*";
  }

  const allowed = parseAllowedOrigins(env);
  if (!allowed.length) {
    return "*";
  }

  return allowed.includes(requestOrigin) ? requestOrigin : "";
}

function applyCorsHeaders(headers, request, env) {
  const origin = resolveOriginHeader(request, env);
  if (!origin) {
    return;
  }
  headers.set("access-control-allow-origin", origin);
  headers.set("access-control-allow-methods", "GET,POST,OPTIONS");
  headers.set("access-control-allow-headers", "Authorization, Content-Type");
  headers.set("access-control-max-age", "86400");
  headers.set("vary", "Origin");
}

function toHeaderObject(headers) {
  const out = {};
  headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

async function requestBodyBuffer(request) {
  const body = await request.arrayBuffer();
  return Buffer.from(body);
}

function createReqFromRequest(request, env, bodyBuffer, parsedBody) {
  const url = new URL(request.url);
  const headers = toHeaderObject(request.headers);
  return {
    method: request.method,
    url: `${url.pathname}${url.search}`,
    query: Object.fromEntries(url.searchParams.entries()),
    headers,
    body: parsedBody || null,
    socket: { remoteAddress: headers["cf-connecting-ip"] || "" },
    cf: { env },
    __cloudflareEnv: env,
    async *[Symbol.asyncIterator]() {
      if (bodyBuffer && bodyBuffer.length > 0) {
        yield bodyBuffer;
      }
    }
  };
}

function createResponseCollector() {
  const headers = new Headers();
  let statusCode = 200;
  let bodyText = "";

  return {
    setHeader(name, value) {
      headers.set(name, String(value));
    },
    get statusCode() {
      return statusCode;
    },
    set statusCode(value) {
      statusCode = value;
    },
    end(value = "") {
      bodyText = typeof value === "string" ? value : String(value);
    },
    toResponse() {
      return new Response(bodyText, {
        status: statusCode,
        headers
      });
    }
  };
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      const headers = new Headers();
      applyCorsHeaders(headers, request, env);
      return new Response(null, { status: 204, headers });
    }

    const url = new URL(request.url);
    const handler = ROUTES.get(url.pathname);
    if (!handler) {
      const headers = new Headers({
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store"
      });
      applyCorsHeaders(headers, request, env);
      return new Response(JSON.stringify({ ok: false, error: "not_found" }), {
        status: 404,
        headers
      });
    }

    const bodyBuffer = await requestBodyBuffer(request);
    let parsedBody = null;
    const contentType = request.headers.get("content-type") || "";
    if (bodyBuffer.length && contentType.includes("application/json")) {
      try {
        parsedBody = JSON.parse(bodyBuffer.toString("utf8"));
      } catch {
        parsedBody = null;
      }
    }

    const req = createReqFromRequest(request, env, bodyBuffer, parsedBody);
    const res = createResponseCollector();

    try {
      await handler(req, res);
      const response = res.toResponse();
      applyCorsHeaders(response.headers, request, env);
      return response;
    } catch {
      const headers = new Headers({
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store"
      });
      applyCorsHeaders(headers, request, env);
      return new Response(JSON.stringify({ ok: false, error: "server_error" }), {
        status: 500,
        headers
      });
    }
  }
};
