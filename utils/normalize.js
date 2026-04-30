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
export const normalizePhone = (phone) => {
  if (!phone) return;

  let p = phone.replace(/\D/g, ""); // only digits

  // already correct (880XXXXXXXXXX)
  if (p.startsWith("880") && p.length === 13) {
    return p;
  }

  // starts with 0 (017XXXXXXXX)
  if (p.startsWith("0") && p.length === 11) {
    return "880" + p.slice(1);
  }

  // user gave without 0 (17XXXXXXXX)
  if (p.length === 10) {
    return "880" + p;
  }

  // fallback: last 10 digits + 880 (your idea, but safe fallback হিসেবে)
  if (p.length > 10) {
    return "880" + p.slice(-10);
  }

  return p;
};
