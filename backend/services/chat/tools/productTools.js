const objectParameters = (properties, required) => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});

export const productTools = [
  {
    type: "function",
    name: "search_products",
    description: "Search the active shop catalog when the customer asks to find or compare products, or the referenced product is not already resolved. Return only matching catalog records.",
    parameters: objectParameters({ query: { type: "string", description: "Customer's product name, type, or search terms." } }, ["query"]),
    strict: true,
  },
  {
    type: "function",
    name: "get_product_details",
    description: "Retrieve verified details for one product already identified in this conversation. Do not search the catalog if a product ID is already known.",
    parameters: objectParameters({ productId: { type: "string" } }, ["productId"]),
    strict: true,
  },
  {
    type: "function",
    name: "check_product_stock",
    description: "Check verified stock and available variants for an identified product. Never infer stock from another product.",
    parameters: objectParameters({ productId: { type: "string" }, variant: { type: ["string", "null"], description: "Requested color/size/variant, or null when unspecified." } }, ["productId", "variant"]),
    strict: true,
  },
  {
    type: "function",
    name: "search_product_by_image",
    description: "Return backend-generated catalog image matches for the customer's uploaded product photo. Use only when image-match results are available.",
    parameters: objectParameters({ query: { type: ["string", "null"], description: "Optional product description from the customer image." } }, ["query"]),
    strict: true,
  },
];

export function createProductToolHandlers({ searchProducts, getProductDetails, checkProductStock, searchProductByImage }) {
  return {
    search_products: async ({ query }) => ({ ok: true, products: await searchProducts(query) }),
    get_product_details: async ({ productId }) => ({ ok: true, product: await getProductDetails(productId) }),
    check_product_stock: async ({ productId, variant }) => ({ ok: true, result: await checkProductStock(productId, variant) }),
    search_product_by_image: async ({ query }) => ({ ok: true, matches: await searchProductByImage(query) }),
  };
}
