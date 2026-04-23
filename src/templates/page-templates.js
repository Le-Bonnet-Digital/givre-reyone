import baseCss from "../styles/base.css?raw";
import version1Css from "../styles/version-1.css?raw";
import legalCss from "../styles/legal.css?raw";
import version1Source from "./version-1-template.html?raw";
import mentionsLegalesSource from "./mentions-legales-template.html?raw";
import politiqueConfidentialiteSource from "./politique-confidentialite-template.html?raw";
import politiqueCookiesSource from "./politique-cookies-template.html?raw";
import cguCgvSource from "./cgu-cgv-template.html?raw";
import { getVersion1InitialDocument, prepareVersion1Document } from "./version-1-document.js";

function sanitizeBodyHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\sdata-edit-key="[^"]*"/g, "")
    .replace(/\sdata-edit-image-key="[^"]*"/g, "")
    .replace(/\sdata-edit-image-hide-when-filled="[^"]*"/g, "")
    .trim();
}

function parseTemplate(source, fallbackTitle, bodyClass) {
  const titleMatch = source.match(/<title>([\s\S]*?)<\/title>/i);
  const bodyMatch = source.match(/<body[^>]*>([\s\S]*?)<\/body>/i);

  return {
    title: (titleMatch?.[1] || fallbackTitle).trim(),
    bodyClass,
    bodyHtml: sanitizeBodyHtml(bodyMatch?.[1] || "")
  };
}

const version1Meta = parseTemplate(
  version1Source,
  "Givre Reyone - L'Ananas Victoria comme vous ne l'avez jamais bu",
  "version-one"
);
const mentionsLegalesMeta = parseTemplate(mentionsLegalesSource, "Mentions légales - Givré Réyoné", "legal-page");
const politiqueConfidentialiteMeta = parseTemplate(
  politiqueConfidentialiteSource,
  "Politique de confidentialité - Givré Réyoné",
  "legal-page"
);
const politiqueCookiesMeta = parseTemplate(
  politiqueCookiesSource,
  "Politique cookies - Givré Réyoné",
  "legal-page"
);
const cguCgvMeta = parseTemplate(cguCgvSource, "CGU / CGV - Givré Réyoné", "legal-page");

const version1InitialDocument = getVersion1InitialDocument();

function createStaticInitialDocument(meta) {
  return {
    html: meta.bodyHtml,
    css: "",
    projectData: null
  };
}

export const PAGE_TEMPLATES = {
  "version-1": {
    id: "version-1",
    title: version1Meta.title,
    bodyClass: version1Meta.bodyClass,
    bodyHtml: version1InitialDocument?.html || version1Meta.bodyHtml,
    css: `${baseCss}\n\n${version1Css}`,
    initialDocument: version1InitialDocument,
    editingMode: "full",
    fontLinks: [
      "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Sans:wght@300;400;500&display=swap"
    ],
    needsReveal: false
  },
  "mentions-legales": {
    id: "mentions-legales",
    title: mentionsLegalesMeta.title,
    bodyClass: mentionsLegalesMeta.bodyClass,
    bodyHtml: mentionsLegalesMeta.bodyHtml,
    css: legalCss,
    initialDocument: createStaticInitialDocument(mentionsLegalesMeta),
    editingMode: "content-only",
    fontLinks: [
      "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Sans:wght@300;400;500&display=swap"
    ],
    needsReveal: false
  },
  "politique-confidentialite": {
    id: "politique-confidentialite",
    title: politiqueConfidentialiteMeta.title,
    bodyClass: politiqueConfidentialiteMeta.bodyClass,
    bodyHtml: politiqueConfidentialiteMeta.bodyHtml,
    css: legalCss,
    initialDocument: createStaticInitialDocument(politiqueConfidentialiteMeta),
    editingMode: "content-only",
    fontLinks: [
      "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Sans:wght@300;400;500&display=swap"
    ],
    needsReveal: false
  },
  "politique-cookies": {
    id: "politique-cookies",
    title: politiqueCookiesMeta.title,
    bodyClass: politiqueCookiesMeta.bodyClass,
    bodyHtml: politiqueCookiesMeta.bodyHtml,
    css: legalCss,
    initialDocument: createStaticInitialDocument(politiqueCookiesMeta),
    editingMode: "content-only",
    fontLinks: [
      "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Sans:wght@300;400;500&display=swap"
    ],
    needsReveal: false
  },
  "cgu-cgv": {
    id: "cgu-cgv",
    title: cguCgvMeta.title,
    bodyClass: cguCgvMeta.bodyClass,
    bodyHtml: cguCgvMeta.bodyHtml,
    css: legalCss,
    initialDocument: createStaticInitialDocument(cguCgvMeta),
    editingMode: "content-only",
    fontLinks: [
      "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Sans:wght@300;400;500&display=swap"
    ],
    needsReveal: false
  }
};

export const PAGE_IDS = Object.keys(PAGE_TEMPLATES);

export function preparePageDocument(page, document) {
  if (!document) {
    return null;
  }

  if (page === "version-1") {
    return prepareVersion1Document(document);
  }

  return document;
}

export function getPageTemplate(page) {
  return PAGE_TEMPLATES[page] || null;
}
