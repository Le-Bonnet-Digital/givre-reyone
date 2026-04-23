import { getPageTemplate, preparePageDocument } from "../templates/page-templates.js";

function setLoadingState(message) {
  const status = document.getElementById("page-status");
  if (status) {
    status.textContent = message || "";
  }
}

function ensureCustomStyle(css) {
  let style = document.getElementById("page-custom-css");
  if (!style) {
    style = document.createElement("style");
    style.id = "page-custom-css";
    document.head.appendChild(style);
  }
  style.textContent = css || "";
}

async function fetchPublishedDocument(page) {
  const response = await fetch(`/api/page-content?page=${encodeURIComponent(page)}&mode=published`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("page_fetch_failed");
  }

  return response.json();
}

async function mountPage() {
  const page = document.body.dataset.page || "";
  const template = getPageTemplate(page);
  const root = document.getElementById("page-root");

  if (!template || !root) {
    return;
  }

  document.title = template.title;
  document.body.className = template.bodyClass;
  document.body.dataset.page = page;
  setLoadingState("Chargement...");

  let documentData = null;
  try {
    const response = await fetchPublishedDocument(page);
    documentData = preparePageDocument(page, response?.document || null);
  } catch {
    documentData = null;
  }

  const fallbackDocument = preparePageDocument(page, template.initialDocument || null);
  const html = documentData?.html || fallbackDocument?.html || template.bodyHtml;
  const css = documentData?.css || fallbackDocument?.css || "";

  ensureCustomStyle(css);
  root.innerHTML = html;
  setLoadingState("");

  if (template.needsReveal) {
    await import("./reveal.js");
  }
}

mountPage();
