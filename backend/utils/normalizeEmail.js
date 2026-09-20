export function normalizeEmail(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized || null;
}
