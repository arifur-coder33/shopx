export const GOOGLE_MAP = {
  view: "view_item",
  add_to_cart: "add_to_cart",
  checkout: "begin_checkout",
  purchase: "purchase",
  search: "view_search_results",
};

export function fireGoogle(event, value, currency = "BDT", items = [], extra = {}) {
  if (typeof window === "undefined") return;

  // GTM's Google Tag consumes gtag commands from the shared dataLayer. A
  // global gtag function is not guaranteed when GTM is the installation path.
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };

  const mappedEvent = GOOGLE_MAP[event] || event;
  const numericValue = Number(value);
  const eventParams = {
    ...(Number.isFinite(numericValue) && { value: numericValue }),
    currency,
    items: items.map((item) => ({
      ...(item.id || item.sku || item.productId
        ? { item_id: String(item.id || item.sku || item.productId) }
        : {}),
      ...(item.productName || item.name
        ? { item_name: String(item.productName || item.name) }
        : {}),
      ...(item.category ? { item_category: String(item.category) } : {}),
      ...(Number.isFinite(Number(item.price)) && { price: Number(item.price) }),
      quantity: Number(item.quantity) || 1,
    })),
    ...(extra.transaction_id && { transaction_id: String(extra.transaction_id) }),
    ...(Number.isFinite(Number(extra.shipping)) && { shipping: Number(extra.shipping) }),
    ...(Number.isFinite(Number(extra.tax)) && { tax: Number(extra.tax) }),
    ...(event === "search" && { search_term: extra.search_string }),
  };

  window.gtag("event", mappedEvent, eventParams);
}
