export function formatOrderAddress({ deliveryAddress, thana, city }) {
  const parts = String(deliveryAddress || "")
    .split(/[,،]/u)
    .map((part) => part.trim())
    .filter(Boolean);
  const normalize = (value) => String(value || "").trim().toLocaleLowerCase().replace(/[.\s]+$/u, "");
  const places = new Set([thana, city].map(normalize).filter(Boolean));
  const seen = new Set();
  const uniqueParts = parts.filter((part) => {
    const key = normalize(part);
    if (!places.has(key)) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  for (const place of [thana, city]) {
    const value = String(place || "").trim();
    const key = normalize(value);
    if (value && !seen.has(key)) {
      uniqueParts.push(value);
      seen.add(key);
    }
  }
  return uniqueParts.join(", ");
}
