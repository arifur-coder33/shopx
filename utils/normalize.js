export function normalizeText(text = "") {
  return text
    .toLowerCase()
    .replace(/আ/g, "া")
    .replace(/ই/g, "ি")
    .replace(/[^a-z0-9\u0980-\u09FF ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function stripHtml(html = "") {
  return html.replace(/<[^>]*>?/gm, " ");
}