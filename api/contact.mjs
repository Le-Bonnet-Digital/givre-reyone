import { readJson } from "./_lib/body.mjs";
import { enforceRateLimit } from "./_lib/rate-limit.mjs";

const REQUEST_LABELS = {
  tasting: "Client - degustation",
  "private-event": "Evenement prive",
  business: "Professionnel",
  updates: "Rester informe"
};

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function normalizeString(value, maxLength) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\r\n/g, "\n").slice(0, maxLength);
}

function normalizeConsent(value) {
  return value === true || value === "true" || value === "yes" || value === "on";
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildContactPayload(body) {
  return {
    firstName: normalizeString(body?.firstName, 80),
    email: normalizeString(body?.email, 200),
    requestType: normalizeString(body?.requestType, 50),
    message: normalizeString(body?.message, 3000),
    companyWebsite: normalizeString(body?.companyWebsite, 200),
    consent: normalizeConsent(body?.consent)
  };
}

function validateContactPayload(payload) {
  const fieldErrors = {};

  if (!payload.firstName) {
    fieldErrors.firstName = "Merci d'indiquer votre prenom.";
  }

  if (!payload.email) {
    fieldErrors.email = "Merci d'indiquer votre email.";
  } else if (!isValidEmail(payload.email)) {
    fieldErrors.email = "Merci d'indiquer un email valide.";
  }

  if (!payload.requestType) {
    fieldErrors.requestType = "Merci de selectionner le type de demande.";
  } else if (!REQUEST_LABELS[payload.requestType]) {
    fieldErrors.requestType = "Type de demande invalide.";
  }

  if (!payload.message) {
    fieldErrors.message = "Merci de preciser votre message.";
  } else if (payload.message.length < 10) {
    fieldErrors.message = "Le message doit contenir au moins 10 caracteres.";
  }

  if (!payload.consent) {
    fieldErrors.consent = "Le consentement est requis.";
  }

  return fieldErrors;
}

function getBrevoConfig() {
  return {
    apiKey: process.env.BREVO_API_KEY || "",
    toEmail: process.env.CONTACT_TO_EMAIL || "",
    fromEmail: process.env.CONTACT_FROM_EMAIL || "",
    fromName: process.env.CONTACT_FROM_NAME || "Givre Reyone"
  };
}

function buildEmailSubject(payload) {
  return `[Givre Reyone] ${REQUEST_LABELS[payload.requestType]} - ${payload.firstName}`;
}

function buildTextContent(payload) {
  return [
    "Nouvelle demande depuis le formulaire Version 1",
    "",
    `Prenom : ${payload.firstName}`,
    `Email : ${payload.email}`,
    `Demande : ${REQUEST_LABELS[payload.requestType]}`,
    "",
    "Message :",
    payload.message
  ].join("\n");
}

function buildHtmlContent(payload) {
  return [
    "<html><body style=\"font-family:Arial,sans-serif;color:#1a1a1a;line-height:1.6;\">",
    "<h2>Nouvelle demande depuis le formulaire Version 1</h2>",
    "<p><strong>Prenom :</strong> " + escapeHtml(payload.firstName) + "</p>",
    "<p><strong>Email :</strong> " + escapeHtml(payload.email) + "</p>",
    "<p><strong>Demande :</strong> " + escapeHtml(REQUEST_LABELS[payload.requestType]) + "</p>",
    "<p><strong>Message :</strong></p>",
    "<p>" + escapeHtml(payload.message).replaceAll("\n", "<br>") + "</p>",
    "</body></html>"
  ].join("");
}

async function sendViaBrevo(payload) {
  const config = getBrevoConfig();
  if (!config.apiKey || !config.toEmail || !config.fromEmail) {
    const error = new Error("contact_not_configured");
    error.code = "contact_not_configured";
    throw error;
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": config.apiKey
    },
    body: JSON.stringify({
      sender: {
        email: config.fromEmail,
        name: config.fromName
      },
      to: [
        {
          email: config.toEmail
        }
      ],
      replyTo: {
        email: payload.email,
        name: payload.firstName
      },
      subject: buildEmailSubject(payload),
      textContent: buildTextContent(payload),
      htmlContent: buildHtmlContent(payload),
      tags: ["contact-form", "version-1"]
    })
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    const error = new Error("brevo_request_failed");
    error.code = "brevo_request_failed";
    error.details = details;
    throw error;
  }

  return response.json().catch(() => null);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    sendJson(res, 405, { ok: false, message: "Method not allowed." });
    return;
  }

  let body;
  try {
    body = await readJson(req);
  } catch {
    sendJson(res, 400, { ok: false, message: "Requete invalide." });
    return;
  }

  const payload = buildContactPayload(body || {});

  if (payload.companyWebsite) {
    sendJson(res, 200, {
      ok: true,
      message: "Merci, votre message a bien ete envoye."
    });
    return;
  }

  const fieldErrors = validateContactPayload(payload);
  if (Object.keys(fieldErrors).length) {
    sendJson(res, 422, {
      ok: false,
      message: "Merci de corriger les champs du formulaire.",
      fieldErrors
    });
    return;
  }

  try {
    const rateLimit = await enforceRateLimit(req, {
      namespace: "contact:v1",
      limit: 5,
      windowSeconds: 3600
    });

    if (!rateLimit.allowed) {
      res.setHeader("Retry-After", String(rateLimit.retryAfter || 3600));
      sendJson(res, 429, {
        ok: false,
        message: "Trop de tentatives pour le moment. Merci de reessayer plus tard."
      });
      return;
    }

    await sendViaBrevo(payload);
    sendJson(res, 200, {
      ok: true,
      message: "Merci, votre message a bien ete envoye. Nous revenons vers vous rapidement."
    });
  } catch (error) {
    const code = error?.code || "";
    if (code === "contact_not_configured") {
      sendJson(res, 500, {
        ok: false,
        message: "Le formulaire n'est pas encore configure cote serveur."
      });
      return;
    }

    sendJson(res, 502, {
      ok: false,
      message: "Impossible d'envoyer le message pour le moment. Merci de reessayer."
    });
  }
}
