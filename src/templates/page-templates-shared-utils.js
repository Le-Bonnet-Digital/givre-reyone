export function sanitizeBodyHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\sdata-edit-key="[^"]*"/g, "")
    .replace(/\sdata-edit-image-key="[^"]*"/g, "")
    .replace(/\sdata-edit-image-hide-when-filled="[^"]*"/g, "")
    .trim();
}

export function parseTemplate(source, fallbackTitle, bodyClass) {
  const titleMatch = source.match(/<title>([\s\S]*?)<\/title>/i);
  const bodyMatch = source.match(/<body[^>]*>([\s\S]*?)<\/body>/i);

  return {
    title: (titleMatch?.[1] || fallbackTitle).trim(),
    bodyClass,
    bodyHtml: sanitizeBodyHtml(bodyMatch?.[1] || "")
  };
}

export function createStaticInitialDocument(meta) {
  return {
    html: meta.bodyHtml,
    css: "",
    projectData: null
  };
}
