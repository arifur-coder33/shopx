export function buildSearchText({ title, description, categoryPath, seoKeyWord }) {
  const plainDescription = stripHtml(description || "");

  const raw = `
    ${title}
    ${plainDescription}
    ${categoryPath}
    ${seoKeyWord || ""}
  `;

  return normalizeText(raw);
}