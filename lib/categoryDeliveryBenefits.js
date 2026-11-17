export const defaultCategoryDeliveryBenefits = {
  exchangeText: "৩ দিনের Size Exchange",
  returnText: "৩ দিনের Return সুবিধা",
};

export function readCategoryDeliveryBenefitFields(data) {
  const values = {};
  for (const [field, fallback] of Object.entries(defaultCategoryDeliveryBenefits)) {
    const mode = data[`${field}Mode`];
    if (mode === undefined) continue;
    if (mode === "inherit") values[field] = null;
    else if (mode === "off") values[field] = "";
    else if (mode === "on") {
      const label = typeof data[field] === "string" ? data[field].trim() : "";
      if (label.length > 120) throw new Error("Exchange/Return text must be 120 characters or fewer.");
      values[field] = label || fallback;
    } else throw new Error("Invalid Exchange/Return setting.");
  }
  return values;
}
