export const PRODUCT_TYPES = [
  { value: "PHYSICAL", label: "Physical" },
  { value: "DIGITAL", label: "Digital" },
  { value: "SERVICE", label: "Service" },
  { value: "VOUCHER", label: "Voucher" },
  { value: "RENTAL", label: "Rental" },
];

export const PRODUCT_STRUCTURES = [
  { value: "SINGLE", label: "Single" },
  { value: "BUNDLE", label: "Bundle" },
  { value: "KIT", label: "Kit" },
  { value: "CONFIGURABLE", label: "Configurable" },
];

export function parseProductClassification({ productType, productStructure }) {
  const classification = {};
  if (productType !== undefined) {
    if (!PRODUCT_TYPES.some(({ value }) => value === productType)) {
      throw new Error("Select a valid product type.");
    }
    classification.productType = productType;
  }
  if (productStructure !== undefined) {
    if (!PRODUCT_STRUCTURES.some(({ value }) => value === productStructure)) {
      throw new Error("Select a valid product structure.");
    }
    classification.productStructure = productStructure;
  }
  return classification;
}
