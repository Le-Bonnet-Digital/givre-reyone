import grapesjs from "grapesjs";
import presetWebpage from "grapesjs-preset-webpage";
import "grapesjs/dist/css/grapes.min.css";
import { PAGE_IDS, getPageTemplate, preparePageDocument } from "../templates/page-templates.js";

const STORAGE_KEY = "gr_admin_token";
const LAST_PAGE_KEY = "gr_admin_last_page";

const state = {
  token: "",
  editor: null,
  currentPage: "version-1",
  template: null,
  blobEnabled: false,
  kvEnabled: false
};

const els = {
  pageSelect: document.getElementById("builder-page"),
  editorStatus: document.getElementById("builder-editor-status"),
  gjs: document.getElementById("gjs"),
  preview: document.getElementById("builder-preview"),
  saveDraft: document.getElementById("builder-save-draft"),
  publish: document.getElementById("builder-publish"),
  reset: document.getElementById("builder-reset"),
  logout: document.getElementById("builder-logout")
};

function setEditorStatus(text) {
  if (els.editorStatus) {
    els.editorStatus.textContent = text;
  }
}

function getToken() {
  return localStorage.getItem(STORAGE_KEY) || "";
}

function setToken(token) {
  localStorage.setItem(STORAGE_KEY, token);
}

function clearToken() {
  localStorage.removeItem(STORAGE_KEY);
}

function setLastPage(page) {
  localStorage.setItem(LAST_PAGE_KEY, page);
}

function getLastPage() {
  return localStorage.getItem(LAST_PAGE_KEY) || "";
}

function redirectToLogin() {
  window.location.replace("/admin.html");
}

async function ping(token) {
  const response = await fetch("/api/admin/ping", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    return { ok: false };
  }

  return response.json();
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    cache: "no-store",
    ...options
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || "request_failed");
  }

  return data;
}

function authHeaders() {
  return {
    Authorization: `Bearer ${state.token}`,
    "Content-Type": "application/json"
  };
}

async function fetchWorkingDocument(page) {
  return requestJson(`/api/page-content?page=${encodeURIComponent(page)}&mode=draft`);
}

async function saveDraft(page, document) {
  return requestJson("/api/admin/page-content/save-draft", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ page, document })
  });
}

async function publishPage(page) {
  return requestJson("/api/admin/page-content/publish", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ page })
  });
}

async function resetDraft(page) {
  return requestJson("/api/admin/page-content/reset", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ page })
  });
}

async function uploadAsset(file) {
  const response = await fetch(`/api/admin/assets/upload?filename=${encodeURIComponent(file.name)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${state.token}`,
      "Content-Type": file.type || "application/octet-stream"
    },
    body: await file.arrayBuffer()
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || "upload_failed");
  }

  return data;
}

function buildDocumentFromEditor() {
  const isContentOnly = state.template?.editingMode === "content-only";
  return {
    html: state.editor?.getHtml() || "",
    css: isContentOnly ? "" : state.editor?.getCss() || "",
    projectData: state.editor?.getProjectData() || null
  };
}

function buildPreviewHtml(documentData) {
  const template = state.template;
  const dynamicCss = template?.editingMode === "content-only" ? "" : documentData.css || "";
  const fontLinks = template.fontLinks
    .map((href) => `<link rel="stylesheet" href="${href}">`)
    .join("");

  return [
    "<!DOCTYPE html>",
    '<html lang="fr">',
    "<head>",
    '  <meta charset="UTF-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
    `  <title>${template.title}</title>`,
    fontLinks,
    `  <style>${template.css}\n${dynamicCss}\n.reveal{opacity:1!important;transform:none!important;}</style>`,
    "</head>",
    `<body class="${template.bodyClass}" data-page="${template.id}">`,
    documentData.html || template.bodyHtml,
    "</body>",
    "</html>"
  ].join("\n");
}

function ensureFrameStyles(editor, template) {
  const doc = editor.Canvas.getDocument();
  const body = editor.Canvas.getBody();
  if (!doc || !body) {
    return;
  }

  body.className = template.bodyClass;
  body.dataset.page = template.id;

  for (const href of template.fontLinks) {
    const id = `font-${btoa(href).replaceAll("=", "")}`;
    if (!doc.getElementById(id)) {
      const link = doc.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = href;
      doc.head.appendChild(link);
    }
  }

  let style = doc.getElementById("gr-template-style");
  if (!style) {
    style = doc.createElement("style");
    style.id = "gr-template-style";
    doc.head.appendChild(style);
  }
  style.textContent = `${template.css}\n.reveal{opacity:1!important;transform:none!important;}`;
}

function iconSvg(name) {
  const icons = {
    section: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16"></path><path d="M4 12h16"></path><path d="M4 18h16"></path></svg>',
    twoColumns: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="8" height="14"></rect><rect x="13" y="5" width="8" height="14"></rect></svg>',
    title: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"></path><path d="M12 7v10"></path></svg>',
    text: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"></path><path d="M4 12h11"></path><path d="M4 17h14"></path></svg>',
    link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14l4-4"></path><path d="M7 17a4 4 0 0 1 0-6l2-2a4 4 0 0 1 6 0"></path><path d="M17 7a4 4 0 0 1 0 6l-2 2a4 4 0 0 1-6 0"></path></svg>',
    list: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7h11"></path><path d="M9 12h11"></path><path d="M9 17h11"></path><circle cx="5" cy="7" r="1"></circle><circle cx="5" cy="12" r="1"></circle><circle cx="5" cy="17" r="1"></circle></svg>',
    button: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="10" rx="5"></rect><path d="M10 12h4"></path></svg>',
    image: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="1"></rect><circle cx="9" cy="10" r="1.5"></circle><path d="M21 16l-6-5-5 5-3-3-4 4"></path></svg>',
    spacer: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h16"></path><path d="M4 16h16"></path><path d="M12 9v6"></path></svg>'
  };

  return icons[name] || icons.text;
}

function blockLabel(name, iconName) {
  return `<span class="gjs-block-icon">${iconSvg(iconName)}</span><span>${name}</span>`;
}

function applyPanelButtonTooltips() {
  const tooltipMap = [
    { key: "sw-visibility", label: "Afficher les contours" },
    { key: "preview", label: "Previsualiser" },
    { key: "fullscreen", label: "Plein ecran" },
    { key: "open-layers", label: "Afficher les calques" },
    { key: "open-sm", label: "Afficher les styles" },
    { key: "open-tm", label: "Afficher les proprietes" },
    { key: "open-blocks", label: "Afficher les blocs" },
    { key: "open-assets", label: "Bibliotheque de medias" },
    { key: "core:undo", label: "Annuler" },
    { key: "core:redo", label: "Retablir" }
  ];

  const panelButtons = document.querySelectorAll(".builder-canvas .gjs-pn-btn");
  panelButtons.forEach((button) => {
    const element = button;
    const command = element.getAttribute("data-command") || "";
    const elementId = element.id || "";
    const classes = element.getAttribute("class") || "";
    const source = [
      command,
      classes,
      elementId
    ]
      .join(" ")
      .toLowerCase();

    const match = tooltipMap.find((entry) => source.includes(entry.key.toLowerCase()));
    let label = match?.label || "";

    if (!label) {
      const fallback = command || elementId || "";
      const cleaned = fallback
        .replace(/^core:/i, "")
        .replace(/^sw-/i, "")
        .replace(/^open-/i, "open ")
        .replace(/[-_:]/g, " ")
        .trim();

      label = cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : "Action";
    }

    element.setAttribute("title", label);
    element.setAttribute("aria-label", label);
  });
}

function addCustomBlocks(editor) {
  const blocks = editor.BlockManager;
  const isContentOnly = state.template?.editingMode === "content-only";
  blocks.getAll().reset();

  blocks.add("gr-section", {
    label: blockLabel("Section", "section"),
    category: "Layout",
    attributes: { class: "gr-block-label" },
    content: `<section class="content-shell" style="padding: 4rem 0;"><h2>Titre de section</h2><p>Ajoute ton contenu ici.</p></section>`
  });

  if (!isContentOnly) {
    blocks.add("gr-two-columns", {
      label: blockLabel("2 colonnes", "twoColumns"),
      category: "Layout",
      attributes: { class: "gr-block-label" },
      content: `
        <section class="content-shell" style="padding: 4rem 0;">
          <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:2rem;">
            <div><h3>Colonne 1</h3><p>Contenu editable.</p></div>
            <div><h3>Colonne 2</h3><p>Contenu editable.</p></div>
          </div>
        </section>
      `
    });
  }

  blocks.add("gr-title", {
    label: blockLabel("Titre", "title"),
    category: "Content",
    attributes: { class: "gr-block-label" },
    content: "<h2 style=\"margin:0 0 1rem;\">Nouveau titre</h2>"
  });

  blocks.add("gr-text", {
    label: blockLabel("Texte", "text"),
    category: "Content",
    attributes: { class: "gr-block-label" },
    content: "<p>Ajoute un paragraphe.</p>"
  });

  if (isContentOnly) {
    blocks.add("gr-link", {
      label: blockLabel("Lien", "link"),
      category: "Content",
      attributes: { class: "gr-block-label" },
      content: "<a href=\"#\">Nouveau lien</a>"
    });

    blocks.add("gr-list", {
      label: blockLabel("Liste", "list"),
      category: "Content",
      attributes: { class: "gr-block-label" },
      content: "<ul><li>Element 1</li><li>Element 2</li></ul>"
    });
  }

  if (!isContentOnly) {
    blocks.add("gr-button", {
      label: blockLabel("Bouton", "button"),
      category: "Content",
      attributes: { class: "gr-block-label" },
      content: "<a href=\"#\" style=\"display:inline-flex;align-items:center;justify-content:center;padding:1rem 1.5rem;background:#d4a847;color:#0a0a08;text-decoration:none;font-family:Syne,sans-serif;font-size:0.72rem;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;\">Nouveau bouton</a>"
    });
  }

  blocks.add("gr-image", {
    label: blockLabel("Image", "image"),
    category: "Media",
    attributes: { class: "gr-block-label" },
    content: { type: "image" }
  });

  if (!isContentOnly) {
    blocks.add("gr-spacer", {
      label: blockLabel("Espace", "spacer"),
      category: "Layout",
      attributes: { class: "gr-block-label" },
      content: "<div style=\"height: 3rem;\"></div>"
    });
  }
}

function configureContentOnlyEditor(editor) {
  if (state.template?.editingMode !== "content-only") {
    return;
  }

  const panel = editor.Panels;
  panel.removeButton("views", "open-sm");
  panel.removeButton("views", "open-tm");

  editor.StyleManager.getSectors().reset([]);
  if (typeof editor.Commands?.remove === "function") {
    editor.Commands.remove("core:open-style-manager");
    editor.Commands.remove("core:open-trait-manager");
  }
}

function destroyEditor() {
  if (!state.editor) {
    return;
  }

  state.editor.destroy();
  state.editor = null;
  if (els.gjs) {
    els.gjs.innerHTML = "";
  }
}

async function handleAssetUpload(event) {
  const files = event.dataTransfer ? event.dataTransfer.files : event.target.files;
  if (!files?.length) {
    return;
  }

  setEditorStatus("Upload de l'asset en cours...");

  for (const file of files) {
    const result = await uploadAsset(file);
    if (result?.url) {
      state.editor.AssetManager.add({ src: result.url, type: "image" });
    }
  }

  setEditorStatus("Asset ajoute.");
}

function getInitialPage() {
  const url = new URL(window.location.href);
  const requested = url.searchParams.get("page") || "";
  if (PAGE_IDS.includes(requested)) {
    return requested;
  }
  const lastPage = getLastPage();
  if (PAGE_IDS.includes(lastPage)) {
    return lastPage;
  }
  return state.currentPage;
}

function shouldLoadProjectData(page, documentData) {
  if (!documentData?.projectData) {
    return false;
  }

  // Keep version-1 strictly aligned with public output: load migrated HTML
  // instead of potentially stale GrapesJS projectData.
  if (page === "version-1") {
    return false;
  }

  return true;
}

async function loadEditor(page) {
  const template = getPageTemplate(page);
  if (!template) {
    return;
  }

  state.currentPage = page;
  setLastPage(page);
  state.template = template;
  destroyEditor();
  setEditorStatus(`Chargement de ${page}...`);

  const response = await fetchWorkingDocument(page);
  const fallbackDocument = preparePageDocument(page, template.initialDocument || null) || {
    html: template.bodyHtml,
    css: "",
    projectData: null
  };
  const documentData = preparePageDocument(page, response.document || fallbackDocument) || fallbackDocument;

  const editor = grapesjs.init({
    container: "#gjs",
    height: "100%",
    width: "auto",
    storageManager: false,
    fromElement: false,
    components: documentData.html || template.bodyHtml,
    style: "",
    plugins: [presetWebpage],
    pluginsOpts: {
      [presetWebpage]: {
        showStylesOnChange: true,
        useCustomTheme: false,
        blocks: ["link-block", "quote", "text-basic"]
      }
    },
    assetManager: {
      upload: false,
      uploadFile: handleAssetUpload
    }
  });

  addCustomBlocks(editor);
  configureContentOnlyEditor(editor);

  editor.on("load", () => {
    if (shouldLoadProjectData(page, documentData)) {
      editor.loadProjectData(documentData.projectData);
    } else {
      editor.setComponents(documentData.html || template.bodyHtml);
      editor.setStyle(documentData.css || "");
    }

    ensureFrameStyles(editor, template);
    setEditorStatus(`Edition de ${page} · source ${response.source}`);
  });

  editor.on("project:load", () => ensureFrameStyles(editor, template));
  editor.on("project:load", () => applyPanelButtonTooltips());
  editor.on("update", () => setEditorStatus(`Edition de ${page} · modifications locales en cours`));

  state.editor = editor;
  window.__grEditor = editor;
  applyPanelButtonTooltips();
}

async function connect(token) {
  const result = await ping(token);

  if (!result?.ok) {
    clearToken();
    redirectToLogin();
    return false;
  }

  state.token = token;
  state.kvEnabled = !!result.kvEnabled;
  state.blobEnabled = !!result.blobEnabled;
  setToken(token);
  setEditorStatus(`Connecte · KV ${state.kvEnabled ? "ON" : "OFF"} · Blob ${state.blobEnabled ? "ON" : "OFF"}`);
  await loadEditor(getInitialPage());
  return true;
}

async function handleSaveDraft() {
  if (!state.editor) return;
  setEditorStatus("Sauvegarde du draft...");
  const rawDocument = buildDocumentFromEditor();
  const convergedDocument = preparePageDocument(state.currentPage, rawDocument) || rawDocument;
  const result = await saveDraft(state.currentPage, convergedDocument);
  setEditorStatus(`Draft sauvegarde · ${result?.draft?.updatedAt || ""}`);
}

async function handlePublish() {
  if (!state.editor) return;
  await handleSaveDraft();
  setEditorStatus("Publication...");
  const result = await publishPage(state.currentPage);
  setEditorStatus(`Page publiee · ${result?.published?.publishedAt || ""}`);
}

async function handleReset() {
  if (!window.confirm("Revenir au template initial pour le draft de cette page ?")) {
    return;
  }

  setEditorStatus("Reset du draft...");
  await resetDraft(state.currentPage);
  await loadEditor(state.currentPage);
}

function handlePreview() {
  if (!state.editor) return;
  const previewWindow = window.open("", "_blank");
  if (!previewWindow) return;
  previewWindow.document.open();
  previewWindow.document.write(buildPreviewHtml(buildDocumentFromEditor()));
  previewWindow.document.close();
}

function bindEvents() {
  els.pageSelect?.addEventListener("change", async (event) => {
    const nextPage = event.target.value;
    const url = new URL(window.location.href);
    url.searchParams.set("page", nextPage);
    window.history.replaceState({}, "", url);
    await loadEditor(nextPage);
  });

  els.preview?.addEventListener("click", handlePreview);
  els.saveDraft?.addEventListener("click", async () => {
    try {
      await handleSaveDraft();
    } catch {
      setEditorStatus("Echec de la sauvegarde du draft.");
    }
  });
  els.publish?.addEventListener("click", async () => {
    try {
      await handlePublish();
    } catch {
      setEditorStatus("Echec de la publication.");
    }
  });
  els.reset?.addEventListener("click", async () => {
    try {
      await handleReset();
    } catch {
      setEditorStatus("Echec du reset.");
    }
  });
  els.logout?.addEventListener("click", () => {
    clearToken();
    destroyEditor();
    redirectToLogin();
  });
}

function populatePages() {
  if (!els.pageSelect) return;
  els.pageSelect.innerHTML = PAGE_IDS.map((page) => `<option value="${page}">${page}</option>`).join("");
  els.pageSelect.value = state.currentPage;
}

async function init() {
  populatePages();
  bindEvents();
  state.currentPage = getInitialPage();
  els.pageSelect.value = state.currentPage;

  const savedToken = getToken();
  if (!savedToken) {
    redirectToLogin();
    return;
  }

  try {
    const ok = await connect(savedToken);
    if (!ok) {
      return;
    }
  } catch {
    clearToken();
    redirectToLogin();
  }
}

init();
