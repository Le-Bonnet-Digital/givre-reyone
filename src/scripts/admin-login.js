const STORAGE_KEY = "gr_admin_token";

function setStatus(text) {
  const status = document.getElementById("admin-status");
  if (status) {
    status.textContent = text;
  }
}

async function ping(token) {
  const response = await fetch("/api/admin/ping", {
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
  setStatus("Service admin indisponible ici. Lance `npm run dev:vercel` puis ouvre l'URL affichee.");
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
