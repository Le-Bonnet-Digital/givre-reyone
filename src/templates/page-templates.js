import { VERSION1_PAGE_TEMPLATE } from "./page-templates-version1.js";
import { LEGAL_PAGE_TEMPLATES } from "./page-templates-legal.js";

export { preparePageDocument } from "./page-templates-logic.js";

export const PAGE_TEMPLATES = {
  "version-1": VERSION1_PAGE_TEMPLATE,
  ...LEGAL_PAGE_TEMPLATES
};

export const PAGE_IDS = Object.keys(PAGE_TEMPLATES);

export function getPageTemplate(page) {
  return PAGE_TEMPLATES[page] || null;
}
