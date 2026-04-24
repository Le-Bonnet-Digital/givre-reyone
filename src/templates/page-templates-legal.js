import legalCss from "../styles/legal.css?raw";
import mentionsLegalesSource from "./mentions-legales-template.html?raw";
import politiqueConfidentialiteSource from "./politique-confidentialite-template.html?raw";
import politiqueCookiesSource from "./politique-cookies-template.html?raw";
import cguCgvSource from "./cgu-cgv-template.html?raw";
import { parseTemplate, createStaticInitialDocument } from "./page-templates-shared-utils.js";

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

const fontLinks = [
  "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Sans:wght@400;500&display=swap"
];

export const LEGAL_PAGE_TEMPLATES = {
  "mentions-legales": {
    id: "mentions-legales",
    title: mentionsLegalesMeta.title,
    bodyClass: mentionsLegalesMeta.bodyClass,
    bodyHtml: mentionsLegalesMeta.bodyHtml,
    css: legalCss,
    initialDocument: createStaticInitialDocument(mentionsLegalesMeta),
    editingMode: "content-only",
    fontLinks,
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
    fontLinks,
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
    fontLinks,
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
    fontLinks,
    needsReveal: false
  }
};
