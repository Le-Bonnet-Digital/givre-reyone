import { readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { getVersion1InitialDocument } from "../src/templates/version-1-document.js";
import { parseTemplate, sanitizeBodyHtml } from "../src/templates/page-templates-shared-utils.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const pagesDir = join(root, "src", "data", "pages");
const writeMode = process.argv.includes("--write");
const revision = "git-backfill-restore-v1";
const now = new Date().toISOString();

const HOMEPAGE_SOURCE = {
  id: "version-1",
  name: "Version 1 - Givré Réyoné",
  source:
    "getVersion1InitialDocument() via src/templates/version-1-published-seed.js, aligned with current migrations",
  async buildDocument() {
    const contract = await readVersion1ContractFragments();
    const base = getVersion1InitialDocument();
    return {
      ...base,
      html: alignHomepageHtml(base?.html || "", contract)
    };
  }
};

const LEGAL_PAGE_SOURCES = [
  {
    id: "mentions-legales",
    name: "Mentions légales",
    templateFile: "mentions-legales-template.html"
  },
  {
    id: "politique-confidentialite",
    name: "Politique de confidentialité",
    templateFile: "politique-confidentialite-template.html"
  },
  {
    id: "politique-cookies",
    name: "Politique cookies",
    templateFile: "politique-cookies-template.html"
  },
  {
    id: "cgu-cgv",
    name: "CGU / CGV",
    templateFile: "cgu-cgv-template.html"
  }
];

function normalizeDocument(document) {
  return {
    html: typeof document?.html === "string" ? document.html : "",
    css: typeof document?.css === "string" ? document.css : "",
    projectData: document?.projectData ?? null
  };
}

function assertIncludes(html, snippet, label) {
  if (!html.includes(snippet)) {
    throw new Error(`missing_${label}`);
  }
}

function assertNotIncludes(html, snippet, label) {
  if (html.includes(snippet)) {
    throw new Error(`unexpected_${label}`);
  }
}

function assertHomepageDocument(document) {
  const html = document.html;
  assertIncludes(html, 'class="v1-section v1-section-product"', "product_section");
  assertIncludes(html, 'class="v1-section v1-section-problem"', "problem_section");
  assertIncludes(html, 'class="v1-section v1-section-avantages"', "avantages_section");
  assertIncludes(html, 'class="v1-section v1-section-social"', "social_section");
  assertIncludes(html, 'class="v1-section v1-section-offre"', "offre_section");
  assertIncludes(html, 'class="v1-section v1-section-objections"', "objections_section");
  assertIncludes(html, 'class="v1-legal-links"', "legal_links");
  assertIncludes(html, 'id="contact"', "contact_anchor");
  assertIncludes(html, '/hero-lcp-800.webp', "hero_lcp_asset");
}

function assertLegalDocument(document) {
  const html = document.html;
  assertIncludes(html, 'class="legal-main"', "legal_main");
  assertNotIncludes(html, "À compléter", "placeholder_text");
}

async function parseLegalTemplate(templateFile) {
  const filePath = join(root, "src", "templates", templateFile);
  const source = await readFile(filePath, "utf8");
  const meta = parseTemplate(source, templateFile, "legal-page");
  return {
    html: meta.bodyHtml,
    css: "",
    projectData: null
  };
}

async function readVersion1ContractFragments() {
  const filePath = join(root, "src", "templates", "version-1-template.html");
  const source = await readFile(filePath, "utf8");
  const contactMatch = source.match(
    /<section class="v1-section v1-section-contact" id="contact">[\s\S]*?<\/section>/i
  );
  const legalNavMatch = source.match(
    /<nav class="v1-legal-links" aria-label="Informations légales">[\s\S]*?<\/nav>/i
  );

  if (!contactMatch?.[0] || !legalNavMatch?.[0]) {
    throw new Error("version1_contract_fragments_missing");
  }

  return {
    contactSection: sanitizeBodyHtml(contactMatch[0]),
    legalNav: sanitizeBodyHtml(legalNavMatch[0])
  };
}

function alignHomepageHtml(html, contract) {
  let next = html.replaceAll('href="#form"', 'href="#contact"');

  const formSectionRegex =
    /<section\b[^>]*id="form"[^>]*class="v1-section v1-section-form"[^>]*>[\s\S]*?<\/section>|<section\b[^>]*class="v1-section v1-section-form"[^>]*id="form"[^>]*>[\s\S]*?<\/section>/i;

  if (formSectionRegex.test(next)) {
    next = next.replace(formSectionRegex, contract.contactSection);
  } else if (!next.includes('id="contact"')) {
    next = next.replace(/<\/main>/i, `${contract.contactSection}</main>`);
  }

  if (!next.includes('class="v1-legal-links"')) {
    next = next.replace(/<\/footer>/i, `${contract.legalNav}\n</footer>`);
  }

  return next;
}

async function readExistingPage(pageId) {
  const filePath = join(pagesDir, `${pageId}.json`);
  try {
    const source = await readFile(filePath, "utf8");
    return JSON.parse(source);
  } catch {
    return null;
  }
}

function documentsEqual(left, right) {
  return JSON.stringify(normalizeDocument(left)) === JSON.stringify(normalizeDocument(right));
}

function buildPagePayload({ id, name, document, existing }) {
  const normalized = normalizeDocument(document);
  const keepExistingTimestamp = documentsEqual(existing, normalized) && existing?.revision === revision;

  return {
    id,
    name,
    html: normalized.html,
    css: normalized.css,
    projectData: normalized.projectData,
    revision,
    revisionedAt: keepExistingTimestamp ? existing.revisionedAt || now : now
  };
}

async function planHomepageWrite() {
  const document = await HOMEPAGE_SOURCE.buildDocument();
  assertHomepageDocument(document);
  const existing = await readExistingPage(HOMEPAGE_SOURCE.id);

  return {
    id: HOMEPAGE_SOURCE.id,
    source: HOMEPAGE_SOURCE.source,
    output: buildPagePayload({
      id: HOMEPAGE_SOURCE.id,
      name: HOMEPAGE_SOURCE.name,
      document,
      existing
    })
  };
}

async function planLegalPageWrite(page) {
  const document = await parseLegalTemplate(page.templateFile);
  assertLegalDocument(document);
  const existing = await readExistingPage(page.id);

  return {
    id: page.id,
    source: `src/templates/${page.templateFile}`,
    output: buildPagePayload({
      id: page.id,
      name: page.name,
      document,
      existing
    })
  };
}

async function writePage(plan) {
  const filePath = join(pagesDir, `${plan.id}.json`);
  const serialized = `${JSON.stringify(plan.output, null, 2)}\n`;
  const current = await readFile(filePath, "utf8").catch(() => "");
  const changed = current !== serialized;

  if (writeMode && changed) {
    await writeFile(filePath, serialized, "utf8");
  }

  return { ...plan, changed };
}

const plannedWrites = [
  await planHomepageWrite(),
  ...(await Promise.all(LEGAL_PAGE_SOURCES.map((page) => planLegalPageWrite(page))))
];

const results = [];
for (const plan of plannedWrites) {
  results.push(await writePage(plan));
}

for (const result of results) {
  const status = result.changed ? (writeMode ? "updated" : "would update") : "unchanged";
  console.log(`${result.id}: ${status}`);
  console.log(`  source: ${result.source}`);
}

if (!writeMode) {
  console.log("\nDry run only. Re-run with --write to update src/data/pages/*.json.");
  console.log("This script is for controlled backfill / restoration only.");
}
