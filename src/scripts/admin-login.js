const STORAGE_KEY = "gr_admin_token";
const API_BASE_STORAGE_KEY = "gr_api_base";

function normalizeApiBase(value) {
  return String(value || "").trim().replace(/\/$/, "");
}

function detectApiBase() {
  const url = new URL(window.location.href);
  const fromQuery = normalizeApiBase(url.searchParams.get("api_base"));
  if (fromQuery) {
    localStorage.setItem(API_BASE_STORAGE_KEY, fromQuery);
    return fromQuery;
  }

  const fromStorage = normalizeApiBase(localStorage.getItem(API_BASE_STORAGE_KEY));
  if (fromStorage) {
    return fromStorage;
  }

  const fromMeta = normalizeApiBase(document.querySelector('meta[name="gr-api-base"]')?.content || "");
  if (fromMeta) {
    return fromMeta;
  }

  const fromGlobal = normalizeApiBase(window.__GR_API_BASE__ || "");
  if (fromGlobal) {
    return fromGlobal;
  }

  return normalizeApiBase(import.meta.env.VITE_ADMIN_API_BASE || "");
}

const API_BASE = detectApiBase();

function apiUrl(path) {
  return API_BASE ? `${API_BASE}${path}` : path;
}

function setStatus(text) {
  const status = document.getElementById("admin-status");
  if (status) {
    status.textContent = text;
  }
}

async function ping(token) {
  const response = await fetch(apiUrl("/api/admin/ping"), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const contentType = response.headers.get("content-type") || "";
  const hasJson = contentType.includes("application/json");

  if (!response.ok) {
    if (hasJson) {
      return response.json().catch(() => ({ ok: false }));
    }
    return { ok: false, error: "admin_api_unavailable" };
  }

  if (!hasJson) {
    return { ok: false, error: "admin_api_unavailable" };
  }

  return response.json().catch(() => ({ ok: false, error: "admin_api_unavailable" }));
}

function setToken(token) {
  localStorage.setItem(STORAGE_KEY, token);
}

function getToken() {
  return localStorage.getItem(STORAGE_KEY) || "";
}

function clearToken() {
  localStorage.removeItem(STORAGE_KEY);
}

function redirectToBuilder() {
  window.location.href = "/builder.html";
}

function setApiUnavailableStatus() {
  setStatus("Service admin indisponible. Verifie l'URL API Cloudflare et recharge.");
}

document.getElementById("admin-login-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const token = document.getElementById("admin-token")?.value?.trim();

  if (!token) {
    setStatus("Mot de passe requis.");
    return;
  }

  setStatus("Verification...");

  try {
    const result = await ping(token);
    if (result?.error === "admin_api_unavailable") {
      setApiUnavailableStatus();
      return;
    }
    if (!result?.ok) {
      setStatus("Connexion refusee.");
      return;
    }

    setToken(token);
    setStatus("Connexion OK. Redirection vers le builder...");
    redirectToBuilder();
  } catch {
    setApiUnavailableStatus();
  }
});

async function initAdminLogin() {
  const existingToken = getToken();
  if (!existingToken) {
    return;
  }

  setStatus("Session existante, verification...");
  try {
    const result = await ping(existingToken);
    if (result?.error === "admin_api_unavailable") {
      setApiUnavailableStatus();
      return;
    }
    if (result?.ok) {
      setStatus("Session valide. Redirection...");
      redirectToBuilder();
      return;
    }
    clearToken();
    setStatus("");
    return;
  } catch {
    // Keep token on transient network errors to avoid unnecessary re-login.
    setApiUnavailableStatus();
  }
}

initAdminLogin();
