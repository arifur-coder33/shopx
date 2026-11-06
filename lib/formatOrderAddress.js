export function formatOrderAddress({ deliveryAddress, thana, city }) {
  const parts = String(deliveryAddress || "")
    .split(/[,،]/u)
    .map((part) => part.trim())
    .filter(Boolean);
  const normalize = (value) => String(value || "").trim().toLocaleLowerCase().replace(/[.\s]+$/u, "");
  const seen = new Set(parts.map(normalize));
  for (const place of [thana, city]) {
    const value = String(place || "").trim();
    const key = normalize(value);
    if (value && !seen.has(key)) {
      parts.push(value);
      seen.add(key);
    }
  }
  return parts.join(", ");
}
