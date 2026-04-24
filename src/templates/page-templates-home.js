import { VERSION1_PAGE_TEMPLATE } from "./page-templates-version1.js";

export { preparePageDocument } from "./page-templates-logic.js";

export function getPageTemplate(page) {
  return page === "version-1" ? VERSION1_PAGE_TEMPLATE : null;
}

/** Homepage shell only; builder uses full `PAGE_IDS` from `page-templates.js`. */
export const PAGE_IDS = ["version-1"];
