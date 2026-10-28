const parameters = (properties, required) => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});

export const commerceTools = [
  {
    type: "function",
    name: "get_delivery_charge",
    description: "Calculate the configured delivery charge for a destination and optional identified product weight. Use verified delivery rates; do not search products for a delivery-only question.",
    parameters: parameters({ destination: { type: "string", description: "District or Dhaka city/outside-Dhaka destination." }, productId: { type: ["string", "null"] }, variant: { type: ["string", "null"], description: "Selected product color, size, or variant when known." } }, ["destination", "productId", "variant"]),
    strict: true,
  },
  {
    type: "function",
    name: "get_order_status",
    description: "Return status only for orders already verified by the backend as belonging to this customer. If no verified match is available, ask for the missing verification information; never reveal another customer's order.",
    parameters: parameters({ orderNo: { type: ["string", "null"] } }, ["orderNo"]),
    strict: true,
  },
  {
    type: "function",
    name: "get_campaigns",
    description: "Retrieve active, published campaign information and terms. Do not invent discounts or apply coupons through this lookup.",
    parameters: parameters({ query: { type: ["string", "null"] } }, ["query"]),
    strict: true,
  },
  {
    type: "function",
    name: "get_checkout_options",
    description: "Return the existing checkout link and required next-step options for an identified product. This function does not create an order.",
    parameters: parameters({ productId: { type: ["string", "null"] } }, ["productId"]),
    strict: true,
  },
];

export function createCommerceToolHandlers({ getDeliveryCharge, getOrderStatus, getCampaigns, getCheckoutOptions }) {
  return {
    get_delivery_charge: async (args) => ({ ok: true, ...(await getDeliveryCharge(args)) }),
    get_order_status: async (args) => ({ ok: true, ...(await getOrderStatus(args)) }),
    get_campaigns: async (args) => ({ ok: true, campaigns: await getCampaigns(args) }),
    get_checkout_options: async (args) => ({ ok: true, ...(await getCheckoutOptions(args)) }),
  };
}

export function isDhakaDestination(destination) {
  const value = String(destination || "").toLocaleLowerCase();
  if (/(?:outside|out of|ঢাকার বাইরে|ঢাকার বাহিরে|সিটির বাইরে)/iu.test(value)) return false;
  return /(?:dhaka|ঢাকা)/iu.test(value);
}
