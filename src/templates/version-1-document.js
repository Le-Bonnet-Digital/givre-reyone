import publishedSeed from "./version-1-published-seed.js";
import { applyPendingMigrations } from "./version-1-migrations.js";

function clone(value) {
  return value ? JSON.parse(JSON.stringify(value)) : null;
}

export function prepareVersion1Document(document) {
  const base = clone(document) || clone(publishedSeed);
  if (!base) {
    return null;
  }

  const normalized = {
    ...base,
    html: typeof (base.html || publishedSeed.html || "") === "string" ? (base.html || publishedSeed.html || "") : "",
    css: typeof base.css === "string" ? base.css : "",
    projectData: base.projectData || null
  };

  return applyPendingMigrations(normalized).document;
}

export function getVersion1InitialDocument() {
  return prepareVersion1Document(publishedSeed);
}
