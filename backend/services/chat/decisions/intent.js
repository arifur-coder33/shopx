export const CHAT_INTENTS = Object.freeze([
  "GENERAL_REPLY",
  "PRODUCT_SEARCH",
  "PRODUCT_DETAILS",
  "PRODUCT_VARIANT_OR_STOCK",
  "PRODUCT_IMAGE_SEARCH",
  "DELIVERY_INFO",
  "ORDER_STATUS",
  "CHECKOUT",
  "CAMPAIGN_OR_DISCOUNT",
  "CLARIFICATION",
  "HUMAN_HANDOFF",
]);

export function normalizeChatIntent(value) {
  return CHAT_INTENTS.includes(value) ? value : "GENERAL_REPLY";
}
