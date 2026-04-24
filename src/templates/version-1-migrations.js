const CONTACT_SECTION_HTML = `
<section class="v1-section v1-section-contact" id="contact">
  <div class="v1-contact-wrapper">
    <span class="v1-section-label v1-section-label-dark">Contact</span>
    <h2 class="v1-section-title">
      <span>Parlons de votre projet.</span><br>
      <span>Choisissez votre canal.</span>
    </h2>
    <p class="v1-form-sub">Une réponse rapide pour vos réservations et demandes d'information.</p>
    <div class="v1-contact-card">
      <a class="v1-contact-button v1-contact-button-primary" href="https://wa.me/262693103908" target="_blank" rel="noopener noreferrer">
        Contacter sur WhatsApp
      </a>
      <p class="v1-contact-meta">
        Le plus rapide : un message WhatsApp au
        <a href="https://wa.me/262693103908" target="_blank" rel="noopener noreferrer">+262 693 10 39 08</a>
        pour réserver une date ou demander un devis.
      </p>
      <div class="v1-contact-links" aria-label="Canaux alternatifs">
        <a class="v1-contact-link" href="mailto:contact@givre-reyone.re">Envoyer un email</a>
        <a class="v1-contact-link" href="https://www.instagram.com/givre_reyone?igsh=OTAybGIwNmgxNXlh" target="_blank" rel="noopener noreferrer">Voir Instagram</a>
      </div>
      <p class="v1-contact-fallback">
        Si un bouton ne s'ouvre pas sur votre appareil, écrivez-nous à
        <a href="mailto:contact@givre-reyone.re">contact@givre-reyone.re</a>.
      </p>
    </div>
  </div>
</section>
`.trim();

const LEGAL_NAV_HTML = `
<nav class="v1-legal-links" aria-label="Informations légales">
  <a href="/mentions-legales.html">Mentions légales</a>
  <a href="/politique-confidentialite.html">Politique de confidentialité</a>
  <a href="/politique-cookies.html">Politique cookies</a>
  <a href="/cgu-cgv.html">CGU / CGV</a>
</nav>
`.trim();

function clone(value) {
  return value ? JSON.parse(JSON.stringify(value)) : null;
}

function replaceFormAnchors(html) {
  if (typeof html !== "string" || !html) {
    return "";
  }
  return html.replaceAll('href="#form"', 'href="#contact"');
}

function replaceLegacyFormSectionRegex(html) {
  if (typeof html !== "string" || !html) {
    return "";
  }
  if (html.includes('id="contact"') && html.includes("v1-contact-button")) {
    return replaceFormAnchors(html);
  }
  const withAnchors = replaceFormAnchors(html);
  return withAnchors.replace(
    /<section class="v1-section v1-section-form" id="form">[\s\S]*?<\/section>/,
    CONTACT_SECTION_HTML
  );
}

function refreshContactSectionRegex(html) {
  if (typeof html !== "string" || !html || !html.includes('id="contact"')) {
    return html;
  }

  return html.replace(
    /<section\b[^>]*id="contact"[^>]*>[\s\S]*?<\/section>/i,
    CONTACT_SECTION_HTML
  );
}

function ensureLegalLinksRegex(html) {
  if (typeof html !== "string" || !html) {
    return "";
  }
  if (html.includes('class="v1-legal-links"')) {
    return html;
  }
  return html.replace(
    /<\/footer>/,
    `${LEGAL_NAV_HTML}
</footer>`
  );
}

function findFormTarget(root) {
  const byId = root.querySelector("#form");
  if (byId) {
    return byId.closest("section") || byId;
  }

  const byClass = root.querySelector("section.v1-section-form");
  if (byClass) {
    return byClass;
  }

  const containingSection = [...root.querySelectorAll("section")].find((section) =>
    Boolean(section.querySelector('form, [id="form"]'))
  );
  if (containingSection) {
    return containingSection;
  }

  const firstForm = root.querySelector("form");
  if (!firstForm) {
    return null;
  }

  return firstForm.closest("section") || firstForm;
}

function replaceLegacyFormSection(html) {
  if (typeof html !== "string" || !html || typeof DOMParser === "undefined") {
    return replaceLegacyFormSectionRegex(html);
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(`<main id="v1-transform-root">${html}</main>`, "text/html");
  const root = document.querySelector("#v1-transform-root");

  if (!root) {
    return replaceLegacyFormSectionRegex(html);
  }

  const target = findFormTarget(root);
  if (target) {
    const contactTemplate = document.createElement("template");
    contactTemplate.innerHTML = CONTACT_SECTION_HTML;
    const contactSection = contactTemplate.content.firstElementChild;
    if (contactSection) {
      target.replaceWith(contactSection);
    }
  } else if (!root.querySelector("#contact")) {
    const contactTemplate = document.createElement("template");
    contactTemplate.innerHTML = CONTACT_SECTION_HTML;
    const contactSection = contactTemplate.content.firstElementChild;
    if (contactSection) {
      root.appendChild(contactSection);
    }
  }

  root.querySelectorAll('a[href="#form"]').forEach((anchor) => {
    anchor.setAttribute("href", "#contact");
  });

  return root.innerHTML;
}

function refreshContactSection(html) {
  if (typeof html !== "string" || !html || typeof DOMParser === "undefined") {
    return refreshContactSectionRegex(html);
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(`<main id="v1-transform-root">${html}</main>`, "text/html");
  const root = document.querySelector("#v1-transform-root");

  if (!root) {
    return refreshContactSectionRegex(html);
  }

  const existingContact = root.querySelector("#contact");
  if (!existingContact) {
    return html;
  }

  const target = existingContact.closest("section") || existingContact;
  const contactTemplate = document.createElement("template");
  contactTemplate.innerHTML = CONTACT_SECTION_HTML;
  const contactSection = contactTemplate.content.firstElementChild;

  if (contactSection) {
    target.replaceWith(contactSection);
  }

  return root.innerHTML;
}

const HERO_PNG_URL =
  "https://x1ayqv7wwavw0m6h.public.blob.vercel-storage.com/builder-assets/1776942961900-Logo_fond_transparent.png";
const HERO_LCP_SRCSET = "/hero-lcp-400.webp 400w, /hero-lcp-800.webp 800w";
const HERO_LCP_SIZES = "(max-width: 480px) 92vw, 420px";

const HERO_LCP_PICTURE = `<picture class="v1-hero-picture"><source srcset="${HERO_LCP_SRCSET}" sizes="${HERO_LCP_SIZES}" type="image/webp" /><img id="ibh3cx" src="${HERO_PNG_URL}" alt="Logo Givré Réyoné" width="400" height="400" loading="eager" fetchpriority="high" decoding="async" /></picture>`;

const HERO_LOGO_SRC_RE =
  "https:\\/\\/x1ayqv7wwavw0m6h\\.public\\.blob\\.vercel-storage\\.com\\/builder-assets\\/1776942961900-Logo_fond_transparent\\.png";

/**
 * LCP: replace oversized remote PNG with local WebP (picture + PNG fallback) and priority hints.
 * Idempotent if picture+webp already present. Tolerates GrapesJS attribute order and `>` or `/>`.
 */
export function optimizeHeroLcpImage(html) {
  if (typeof html !== "string" || !html) {
    return html;
  }
  if (html.includes("/hero-lcp-800.webp") && html.includes("v1-hero-picture")) {
    return html;
  }
  const reFlexible = new RegExp(
    `<img\\b(?=[^>]*\\bid\\s*=\\s*"ibh3cx")(?=[^>]*\\bsrc\\s*=\\s*"${HERO_LOGO_SRC_RE}")[^>]*(?:\\/>|>)`,
    "i"
  );
  if (reFlexible.test(html)) {
    return html.replace(reFlexible, HERO_LCP_PICTURE);
  }
  return html;
}

function ensureLegalLinks(html) {
  if (typeof html !== "string" || !html || typeof DOMParser === "undefined") {
    return ensureLegalLinksRegex(html);
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(`<main id="v1-transform-root">${html}</main>`, "text/html");
  const root = document.querySelector("#v1-transform-root");

  if (!root) {
    return ensureLegalLinksRegex(html);
  }

  const footer = root.querySelector("footer");
  if (footer && !footer.querySelector(".v1-legal-links")) {
    const legalTemplate = document.createElement("template");
    legalTemplate.innerHTML = LEGAL_NAV_HTML;
    const legalLinks = legalTemplate.content.firstElementChild;
    if (legalLinks) {
      footer.appendChild(legalLinks);
    }
  }

  return root.innerHTML;
}

function normalizeMigrationMeta(documentData) {
  const projectData = clone(documentData.projectData) || {};
  const currentMeta = projectData.__grMeta && typeof projectData.__grMeta === "object" ? projectData.__grMeta : {};
  const appliedMigrations = Array.isArray(currentMeta.appliedMigrations)
    ? currentMeta.appliedMigrations.filter((id) => typeof id === "string")
    : [];
  return { projectData, currentMeta, appliedMigrations };
}

const MIGRATIONS = [
  {
    id: "v1-contact-cta",
    apply(documentData) {
      return {
        ...documentData,
        html: replaceLegacyFormSection(documentData.html || "")
      };
    }
  },
  {
    id: "v1-contact-ux-refresh",
    apply(documentData) {
      return {
        ...documentData,
        html: refreshContactSection(documentData.html || "")
      };
    }
  },
  {
    id: "v1-legal-links",
    apply(documentData) {
      return {
        ...documentData,
        html: ensureLegalLinks(documentData.html || "")
      };
    }
  },
  {
    id: "v1-hero-lcp",
    apply(documentData) {
      return {
        ...documentData,
        html: optimizeHeroLcpImage(documentData.html || "")
      };
    }
  }
];

export function applyPendingMigrations(documentData) {
  const base = clone(documentData) || { html: "", css: "", projectData: null };
  base.html = typeof base.html === "string" ? base.html : "";

  const { projectData, currentMeta, appliedMigrations } = normalizeMigrationMeta(base);
  const knownApplied = new Set(appliedMigrations);
  const newlyApplied = [];
  let working = base;

  for (const migration of MIGRATIONS) {
    if (knownApplied.has(migration.id)) {
      continue;
    }
    working = migration.apply(working);
    knownApplied.add(migration.id);
    newlyApplied.push(migration.id);
  }

  const orderedApplied = MIGRATIONS.map((migration) => migration.id).filter((id) => knownApplied.has(id));
  working.projectData = {
    ...projectData,
    __grMeta: {
      ...currentMeta,
      appliedMigrations: orderedApplied
    }
  };

  return {
    document: working,
    appliedMigrations: newlyApplied
  };
}

export const VERSION1_MIGRATIONS = MIGRATIONS.map((migration) => migration.id);
