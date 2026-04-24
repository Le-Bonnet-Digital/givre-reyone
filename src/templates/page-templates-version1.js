import baseCss from "../styles/base.css?raw";
import version1Css from "../styles/version-1.css?raw";
import version1Source from "./version-1-template.html?raw";
import { getVersion1InitialDocument } from "./version-1-document.js";
import { parseTemplate } from "./page-templates-shared-utils.js";

const version1Meta = parseTemplate(
  version1Source,
  "Givre Reyone - L'Ananas Victoria comme vous ne l'avez jamais bu",
  "version-one"
);

const version1InitialDocument = getVersion1InitialDocument();

export const VERSION1_PAGE_TEMPLATE = {
  id: "version-1",
  title: version1Meta.title,
  bodyClass: version1Meta.bodyClass,
  bodyHtml: version1InitialDocument?.html || version1Meta.bodyHtml,
  css: `${baseCss}\n\n${version1Css}`,
  initialDocument: version1InitialDocument,
  editingMode: "full",
  fontLinks: [
    "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Sans:wght@400;500&display=swap"
  ],
  needsReveal: false
};
