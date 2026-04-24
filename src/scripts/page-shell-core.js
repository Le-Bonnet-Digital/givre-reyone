/**
 * @param {{ getPageTemplate: (page: string) => object | null, preparePageDocument: (page: string, document: unknown) => unknown }} deps
 */
export function runPageShell(deps) {
  const { getPageTemplate, preparePageDocument } = deps;

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
    const next = css || "";
    if (style.textContent === next) {
      return;
    }
    style.textContent = next;
  }

  function isPageShellDebug() {
    try {
      if (typeof window === "undefined") {
        return false;
      }
      if (new URLSearchParams(window.location.search).get("debugShell") === "1") {
        return true;
      }
      return window.localStorage?.getItem("DEBUG_PAGE_SHELL") === "1";
    } catch {
      return false;
    }
  }

  /**
   * @param {string} label
   * @param {Record<string, unknown>} data
   */
  function tracePageShell(label, data) {
    if (!isPageShellDebug()) {
      return;
    }
    const max = 12000;
    const out = { ...data };
    for (const key of Object.keys(out)) {
      const v = out[key];
      if (typeof v === "string" && v.length > max) {
        out[key] = `${v.slice(0, max)}… (${v.length} chars total)`;
      }
    }
    console.info(`[page-shell] ${label}`, out);
  }

  /**
   * @param {string} html
   * @returns {string}
   */
  function stripFirstV1HeaderAndHeroFromHtml(html) {
    if (typeof html !== "string" || !html) {
      return html;
    }
    const wrap = document.createElement("div");
    wrap.innerHTML = html;
    wrap.querySelector("header.v1-header")?.remove();
    wrap.querySelector("section.v1-hero")?.remove();
    return wrap.innerHTML;
  }

  /**
   * @param {string} html
   * @returns {Element | null}
   */
  function getFirstV1HeaderFromHtml(html) {
    if (typeof html !== "string" || !html) {
      return null;
    }
    const wrap = document.createElement("div");
    wrap.innerHTML = html;
    return wrap.querySelector("header.v1-header");
  }

  /**
   * @param {string} html
   * @returns {Element | null}
   */
  function getFirstV1HeroFromHtml(html) {
    if (typeof html !== "string" || !html) {
      return null;
    }
    const wrap = document.createElement("div");
    wrap.innerHTML = html;
    return wrap.querySelector("section.v1-hero");
  }

  function hasVersion1AboveFoldPrerender() {
    return Boolean(document.getElementById("v1-header-prerender") || document.getElementById("v1-hero-prerender"));
  }

  /**
   * @param {Element} section
   */
  function normalizeV1HeroInnerMarkup(section) {
    const clone = section.cloneNode(true);
    clone.removeAttribute("id");
    clone.removeAttribute("data-v1-hero");
    return clone.innerHTML
      .replace(/<br\s*\/?>/gi, "<br>")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * @param {Element} header
   */
  function normalizeV1HeaderInnerMarkup(header) {
    const clone = header.cloneNode(true);
    clone.removeAttribute("id");
    clone.removeAttribute("data-v1-header");
    return clone.innerHTML.replace(/\s+/g, " ").trim();
  }

  async function fetchPublishedDocument(page) {
    const response = await fetch(`/api/page-content?page=${encodeURIComponent(page)}&mode=published`, {
      cache: "default"
    });

    if (!response.ok) {
      throw new Error("page_fetch_failed");
    }

    return response.json();
  }

  function mergeStrippedIntoPrerenderShell(root, stripped) {
    const shell = document.getElementById("v1-main-prerender-shell");
    if (!shell || !stripped) {
      root.innerHTML = stripped;
      return root.querySelector("main");
    }

    const wrap = document.createElement("div");
    wrap.innerHTML = stripped;
    for (const child of [...wrap.children]) {
      if (child.matches?.("main")) {
        while (child.firstChild) {
          shell.appendChild(child.firstChild);
        }
      } else {
        root.appendChild(child);
      }
    }
    return shell;
  }

  function mountWithPrerenderedAboveFold(preparedHtml, publishedApiOk) {
    const root = document.getElementById("page-root");
    const headerStatic = document.getElementById("v1-header-prerender");
    const heroStatic = document.getElementById("v1-hero-prerender");
    if (!root || (!headerStatic && !heroStatic)) {
      return;
    }

    const stripped = stripFirstV1HeaderAndHeroFromHtml(preparedHtml);
    const main = mergeStrippedIntoPrerenderShell(root, stripped);

    if (!main) {
      root.innerHTML = preparedHtml;
      return;
    }

    const apiHeader = publishedApiOk ? getFirstV1HeaderFromHtml(preparedHtml) : null;
    const apiHero = publishedApiOk ? getFirstV1HeroFromHtml(preparedHtml) : null;

    if (publishedApiOk && apiHeader) {
      const sameHeader =
        Boolean(headerStatic) &&
        apiHeader instanceof Element &&
        headerStatic instanceof Element &&
        normalizeV1HeaderInnerMarkup(apiHeader) === normalizeV1HeaderInnerMarkup(headerStatic);
      if (!sameHeader) {
        root.insertBefore(apiHeader.cloneNode(true), main);
        headerStatic?.remove();
      }
    } else if (headerStatic) {
      root.insertBefore(headerStatic, main);
    }

    if (publishedApiOk && apiHero) {
      const sameHero =
        Boolean(heroStatic) &&
        apiHero instanceof Element &&
        heroStatic instanceof Element &&
        normalizeV1HeroInnerMarkup(apiHero) === normalizeV1HeroInnerMarkup(heroStatic);
      if (!sameHero) {
        main.prepend(apiHero.cloneNode(true));
        heroStatic?.remove();
      }
    } else if (heroStatic) {
      main.prepend(heroStatic);
    }

    if (isPageShellDebug()) {
      const customStyle = document.getElementById("page-custom-css");
      const heroEl = root.querySelector("main .v1-hero");
      const headerEl = root.querySelector("header.v1-header");
      tracePageShell("mountWithPrerenderedAboveFold", {
        publishedApiOk,
        hasShell: Boolean(document.getElementById("v1-main-prerender-shell")),
        apiHeaderFound: Boolean(apiHeader),
        apiHeroFound: Boolean(apiHero),
        strippedLength: stripped?.length ?? 0,
        preparedHtmlLength: preparedHtml?.length ?? 0,
        headerOuterHTML: headerEl?.outerHTML ?? null,
        heroOuterHTML: heroEl?.outerHTML ?? null,
        pageCustomCss: customStyle?.textContent ?? ""
      });
    }
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

    const skipLoadingBanner = page === "version-1" && hasVersion1AboveFoldPrerender();
    if (!skipLoadingBanner) {
      setLoadingState("Chargement...");
    }

    let documentData = null;
    let publishedApiOk = false;
    /** @type {{ source?: string; mode?: string; document?: unknown } | null} */
    let apiRaw = null;
    try {
      apiRaw = await fetchPublishedDocument(page);
      documentData = preparePageDocument(page, apiRaw?.document || null);
      publishedApiOk = Boolean(apiRaw?.document);
    } catch {
      documentData = null;
      publishedApiOk = false;
    }

    const fallbackDocument = preparePageDocument(page, template.initialDocument || null);
    const fullFallbackHtml = fallbackDocument?.html || template.bodyHtml;
    const preparedHtml = documentData?.html || fullFallbackHtml;
    const css = documentData?.css || fallbackDocument?.css || "";

    if (isPageShellDebug()) {
      tracePageShell("before mount", {
        page,
        apiSource: apiRaw?.source ?? "(fetch failed)",
        apiMode: apiRaw?.mode,
        publishedApiOk,
        hasDocumentData: Boolean(documentData),
        preparedHtmlPreview: (preparedHtml || "").slice(0, 600),
        cssLength: (css || "").length,
        cssPreview: (css || "").slice(0, 2000)
      });
    }

    ensureCustomStyle(css);

    if (page === "version-1" && hasVersion1AboveFoldPrerender()) {
      mountWithPrerenderedAboveFold(preparedHtml, publishedApiOk);
    } else {
      root.innerHTML = preparedHtml;
    }

    setLoadingState("");

    if (template.needsReveal) {
      await import("./reveal.js");
    }
  }

  mountPage();
}
