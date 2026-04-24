import { prepareVersion1Document } from "./version-1-document.js";

export function preparePageDocument(page, document) {
  if (!document) {
    return null;
  }

  if (page === "version-1") {
    return prepareVersion1Document(document);
  }

  return document;
}
