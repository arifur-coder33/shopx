import { stripHtml } from "@/utils/normalize";
import { normalizeText } from "./search";

export function buildSearchText({
  title,
  description,
  categoryPath,
  seoKeyWord,
}) {
  const plainDescription = stripHtml(description || "");

  const raw = `
    ${title}
    ${plainDescription}
    ${categoryPath}
    ${seoKeyWord || ""}
  `;

  const normalized = normalizeText(raw);
  const compactTitle = normalizeText(title || "").replace(/\s/g, "");
  return compactTitle ? `${normalized} ${compactTitle}` : normalized;
}
